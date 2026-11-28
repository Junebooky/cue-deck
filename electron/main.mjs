import {app,BrowserWindow,ipcMain,screen,dialog} from 'electron';
import {readFile,writeFile,mkdir,readdir,rename,stat,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePackage,initialPlayback,playback,viewFor} from '../src/model.mjs';
import {demo} from '../src/demo.mjs';
import {editCueRevision,readWorkingDeck,assertEditBase} from '../src/cue-editor.mjs';
import {compareRevisions,assertActivation} from '../src/revision-review.mjs';
import {describeDisplays,selectOutputDisplay,coversDisplay,testView} from '../src/display-policy.mjs';
import {validScale,readScale,advanceStyleSequence} from '../src/caption-scale.mjs';
import {validFont,readFont,DEFAULT_FONT} from '../src/caption-fonts.mjs';
import {isNativeCueShortcut} from '../src/shortcuts.mjs';
import {cueWidths,updateWidths,assertWidthEdit} from '../src/caption-widths.mjs';
import {readSettings,effectiveStyle,editSettings} from '../src/caption-style.mjs';
import {assertVersionDelete} from '../src/version-delete.mjs';
import {readPerformance,withPerformance} from '../src/performance-data.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
let operator=null,audience=null,displayId=null,ready=false,ack=-1,deck=validatePackage(demo),state=initialPlayback(),versions=new Map([['demo',deck]]),active='demo';
let localOnly=false;
const outputActive=()=>localOnly||!!audience;
let ackTimer=null,startTimer=null,placementTimer=null,revision=0,changingDeck=false,outputError='',testing=false,started=false,ackDeadline=0;
const mac=process.platform==='darwin';
let captionScale=100,captionFont=DEFAULT_FONT,scaleChanging=false,widthChanging=false,captionWidths={},widthLoadError='',captionSettings=null,styleLoadError='';
const stylePath=id=>path.join(app.getPath('userData'),'shows',id+'.style.json');
async function loadStyle(id){const embedded=readPerformance(versions.get(id));if(embedded)return embedded.captionSettings;try{return readSettings(JSON.parse(await readFile(stylePath(id),'utf8')))}catch(e){if(e.code==='ENOENT')return null;throw Error('자막 스타일 읽기 실패: '+e.message)}}
const settings=()=>readSettings(captionSettings,captionFont,captionScale);
const widthPath=id=>path.join(app.getPath('userData'),'shows',id+'.widths.json');
async function loadWidths(id){const embedded=readPerformance(versions.get(id));if(embedded)return embedded.captionWidths;try{const v=JSON.parse(await readFile(widthPath(id),'utf8'));return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){if(e.code==='ENOENT')return {};throw Error('열 너비 설정을 읽을 수 없습니다: '+e.message)}}
const scalePath=()=>path.join(app.getPath('userData'),'caption-scale.json');
async function loadScale(){try{const saved=JSON.parse(await readFile(scalePath(),'utf8'));captionScale=readScale(saved.scale);captionFont=readFont(saved.font)}catch{captionScale=100;captionFont=DEFAULT_FONT}}
const dataDir=()=>path.join(app.getPath('userData'),'shows');
const workingPath=id=>path.join(dataDir(),id+'.working.json');
const backupPath=id=>path.join(dataDir(),id+'.backup.json');
const workingErrors=new Map();
async function atomicJson(file,value){const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2),'utf8');await rename(tmp,file)}
async function readWorking(id,base){try{return readWorkingDeck(base,JSON.parse(await readFile(workingPath(id),'utf8')))}catch(e){if(e.code==='ENOENT')return base;workingErrors.set(id,e.message);return base}}
async function persistWorking(candidate,style=settings(),widths=captionWidths){
 assertWorking(active);if(styleLoadError||widthLoadError)throw Error('기존 자막 설정을 확인하세요.');
 const previous=withPerformance(deck,settings(),captionWidths),next=withPerformance(candidate,style,widths);
 if(Buffer.byteLength(JSON.stringify(next,null,2))>20*1024*1024)throw Error('20MB 초과');
 await atomicJson(backupPath(active),previous);await atomicJson(workingPath(active),next);
 deck=next;versions.set(active,next);captionSettings=next.performanceSettings.captionSettings;captionWidths=next.performanceSettings.captionWidths;
 return next;
}
function assertWorking(id){if(workingErrors.has(id))throw Error('편집 대본 읽기 실패. 기존 파일을 보존했습니다: '+workingErrors.get(id))}
const snapshot=()=>({revision:++revision,deck,state,active,captionScale:settings().style.scale,captionFont:settings().style.font,captionSettings,captionWidths,versions:[...versions].map(([id,d])=>({id,title:d.title,revision:d.revision,count:d.frames.length})),output:{open:localOnly||!!audience&&!audience.isDestroyed(),localOnly,ready,displayId,ack,error:outputError,testing,testView:testing?output().view:null}});
const output=()=>({sequence:state.sequence,captionScale:settings().style.scale,captionFont:settings().style.font,typography:effectiveStyle(settings(),testing?null:deck.frames[state.index]),ratios:testing?null:cueWidths(captionWidths,deck.frames[state.index]),view:testing?testView(displays().find(d=>d.id===displayId)??{label:'Display',width:0,height:0}):viewFor(deck,state)});
const notify=()=>{if(operator&&!operator.isDestroyed())operator.webContents.send('deck:state-update',snapshot())};
function validPlacement(w){
 const d=screen.getAllDisplays().find(d=>d.id===displayId);
 return !!d&&!!w&&!w.isDestroyed()&&w.isVisible()&&screen.getDisplayMatching(w.getBounds()).id===d.id&&coversDisplay(w.getBounds(),d.bounds)&&(mac?w.isSimpleFullScreen():w.isFullScreen());
}
function failOutput(message){stopOutput(message)}
function sendOutput(){
 if(!audience||audience.isDestroyed()||!started)return;
 ready=false;clearTimeout(ackTimer);ackDeadline=Date.now()+8000;
 const w=audience,seq=state.sequence;
 const attempt=()=>{
  if(audience!==w||w.isDestroyed()||state.sequence!==seq)return;
  if(Date.now()>=ackDeadline){failOutput('관객 화면 응답 없음. 디스플레이를 다시 선택하세요.');return}
  if(validPlacement(w))w.webContents.send('deck:output',output());
  ackTimer=setTimeout(attempt,400);
 };
 attempt();
}
function requireOperator(e){if(!operator||e.sender!==operator.webContents)throw new Error('운영자 권한 필요')}
function requireAudience(e){if(!audience||e.sender!==audience.webContents)throw new Error('관객 창 권한 필요')}
function win(options,mode){const w=new BrowserWindow({...options,backgroundColor:'#000000',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:mode!=='audience'}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());if(mode==='operator'){w.webContents.on('before-input-event',(_event,input)=>{w.webContents.setIgnoreMenuShortcuts(isNativeCueShortcut(input))})}return w}
function loadWindow(w,mode){return w.loadFile(path.join(here,'../dist/index.html'),{query:{mode}})}
function displays(){return describeDisplays(screen.getAllDisplays(),operator&&!operator.isDestroyed()?screen.getDisplayMatching(operator.getBounds()).id:null,screen.getPrimaryDisplay().id)}
function stopOutput(message=''){clearTimeout(ackTimer);clearTimeout(startTimer);clearInterval(placementTimer);localOnly=false;ready=false;ack=-1;started=false;testing=false;outputError=message;displayId=null;state=playback(state,{type:'BLACK'},deck.frames.length);const old=audience;audience=null;if(old&&!old.isDestroyed()){old.hide();old.destroy()}notify()}
async function loadVersions(){await mkdir(dataDir(),{recursive:true});for(const file of await readdir(dataDir())){if(!/^[a-f0-9]{64}\.json$/.test(file))continue;try{const raw=await readFile(path.join(dataDir(),file),'utf8');if(createHash('sha256').update(raw).digest('hex')!==file.slice(0,-5))continue;versions.set(file.slice(0,-5),validatePackage(JSON.parse(raw)))}catch{}}for(const [id,base] of versions)versions.set(id,await readWorking(id,base));try{const saved=(await readFile(path.join(dataDir(),'active'),'utf8')).trim();if(versions.has(saved))active=saved}catch{}deck=versions.get(active)}
async function persistActive(id){const temp=path.join(dataDir(),'active.tmp');await writeFile(temp,id,'utf8');await rename(temp,path.join(dataDir(),'active'))}
function register(){
 ipcMain.handle('deck:state',e=>{requireOperator(e);return snapshot()});
 ipcMain.handle('deck:displays',e=>{requireOperator(e);return displays()});
 ipcMain.handle('deck:output-state',e=>{requireAudience(e);return output()});
 ipcMain.on('deck:ack',(e,seq)=>{if(!audience||e.sender!==audience.webContents||seq!==state.sequence||!started||!validPlacement(audience))return;clearTimeout(ackTimer);ack=seq;ready=true;notify()});
 ipcMain.handle('deck:start',async(e,id)=>{
  requireOperator(e);assertWorking(active);if(outputActive()||changingDeck||scaleChanging||widthChanging)throw new Error('송출 창 또는 대본 변경 작업이 진행 중입니다');
  const operatorId=screen.getDisplayMatching(operator.getBounds()).id;
  const display=selectOutputDisplay(screen.getAllDisplays(),id,operatorId);
  state=playback(state,{type:'RESET'},deck.frames.length);ready=false;ack=-1;displayId=id;started=false;testing=false;outputError='';
  if(display.id===operatorId){localOnly=true;started=true;ready=true;notify();return snapshot()}
  const w=win({...display.bounds,show:false,frame:false,resizable:false,skipTaskbar:true,fullscreenable:true,hasShadow:false},'audience');audience=w;
  w.on('closed',()=>{if(audience===w)stopOutput('관객 창이 닫혔습니다. 다시 연결하세요.')});
  w.webContents.on('render-process-gone',()=>{if(audience===w)failOutput('관객 화면 렌더러 오류')});
  w.webContents.on('did-fail-load',(_e,code,desc,_url,mainFrame)=>{if(audience===w&&mainFrame&&code!==-3)failOutput('관객 화면 로드 실패: '+desc)});
  w.on('leave-full-screen',()=>{if(!mac&&audience===w&&started)failOutput('관객 화면이 전체 화면에서 벗어났습니다.')});
  startTimer=setTimeout(()=>{if(audience===w&&!started)failOutput('관객 화면 준비 시간 초과. 다시 연결하세요.')},12000);
  notify();
  try{
   await loadWindow(w,'audience');
   if(audience!==w||w.isDestroyed())throw new Error(outputError||'관객 창 연결이 취소되었습니다.');
   // macOS native fullscreen changes Spaces asynchronously. Simple fullscreen keeps the selected display in the current Space.
   w.setBounds(display.bounds);
   w.show();
   if(mac){w.setSimpleFullScreen(true)}else{w.setFullScreen(true)}
   const deadline=Date.now()+5000;
   while(audience===w&&!w.isDestroyed()&&!validPlacement(w)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
   if(audience!==w||!validPlacement(w))throw new Error(outputError||'선택한 디스플레이에 전체 화면을 배치하지 못했습니다. 확장 모드를 확인하세요.');
   clearTimeout(startTimer);started=true;operator?.focus();sendOutput();placementTimer=setInterval(()=>{if(audience===w&&started&&!validPlacement(w))failOutput('관객 화면이 선택한 디스플레이에서 벗어났습니다. 다시 연결하세요.')},1000);notify();return snapshot();
  }catch(err){if(audience===w)failOutput(err.message);throw err}
 });
 ipcMain.handle('deck:stop',e=>{requireOperator(e);stopOutput();return snapshot()});
 ipcMain.handle('deck:caption-scale',async(e,value)=>{
  requireOperator(e);
  if(!validScale(value))throw new Error('자막 크기는 90~120%, 5% 단위만 가능합니다.');
  if(scaleChanging||widthChanging||changingDeck||(audience&&!ready))throw new Error('진행 중인 작업 또는 관객 화면 응답을 확인하세요.');
  if(value===settings().style.scale)return snapshot();
  scaleChanging=true;
  try{
   await persistWorking(deck,{...settings(),style:{...settings().style,scale:value}});state=advanceStyleSequence(state);sendOutput();notify();return snapshot();
  }finally{scaleChanging=false}
 });
 ipcMain.handle('deck:caption-font',async(e,value)=>{
  requireOperator(e);
  if(!validFont(value))throw new Error('지원하지 않는 자막 폰트');
  if(scaleChanging||widthChanging||changingDeck||(audience&&!ready))throw new Error('진행 중인 작업 또는 관객 화면 응답을 확인하세요.');
  if(value===settings().style.font)return snapshot();
  scaleChanging=true;
  try{
   await persistWorking(deck,{...settings(),style:{...settings().style,font:value}});state=advanceStyleSequence(state);sendOutput();notify();return snapshot();
  }finally{scaleChanging=false}
 });
 ipcMain.handle('deck:caption-style',async(e,expected,index,value)=>{
  requireOperator(e);if(styleLoadError)throw Error(styleLoadError);
  if(active!==expected||changingDeck||scaleChanging||widthChanging||(audience&&!ready))throw Error('대본 또는 송출 준비 상태를 확인하세요.');
  const updated=editSettings(settings(),deck,index,value,outputActive(),state.index);
  scaleChanging=true;
  try{await persistWorking(deck,updated);if(index===null){state=advanceStyleSequence(state);sendOutput()}notify();return snapshot()}finally{scaleChanging=false}
 });
 ipcMain.handle('deck:caption-widths',async(e,expected,index,value)=>{
  requireOperator(e);if(widthLoadError)throw Error(widthLoadError);if(changingDeck||scaleChanging||widthChanging)throw Error('다른 설정 작업 중입니다.');
  const frame=assertWidthEdit(deck,active,expected,index,value,outputActive(),state.index);
  widthChanging=true;
  try{const next=updateWidths(captionWidths,frame,value);await persistWorking(deck,settings(),next);notify();return snapshot()}finally{widthChanging=false}
 });
 ipcMain.handle('deck:test-output',(e,enabled)=>{requireOperator(e);if(!audience||!started||!ready)throw new Error('관객 화면 연결 확인 후 테스트하세요');testing=enabled===true;state=playback(state,{type:'BLACK'},deck.frames.length);sendOutput();notify();return snapshot()});
 ipcMain.handle('deck:command',(e,action)=>{requireOperator(e);if(!action||!['GO','PREV','BLACK','RESTORE'].includes(action.type))throw new Error('지원하지 않는 명령');if(action.type!=='BLACK')assertWorking(active);if((changingDeck||widthChanging||scaleChanging)&&action.type!=='BLACK')throw Error('열 너비 저장 중입니다.');if(testing&&action.type!=='BLACK')throw new Error('화면 테스트를 종료한 후 송출하세요');if(action.type!=='BLACK'&&audience&&!ready)throw new Error('관객 화면 준비 확인 대기');if(action.type==='BLACK')testing=false;state=playback(state,action,deck.frames.length);sendOutput();notify();return snapshot()});
 ipcMain.handle('deck:import',async e=>{requireOperator(e);if(outputActive()||changingDeck)throw new Error('공연 종료 및 기존 작업 완료 후 대본을 불러오세요');changingDeck=true;try{const res=await dialog.showOpenDialog(operator,{properties:['openFile'],filters:[{name:'Cue Deck JSON',extensions:['json']}]});if(res.canceled)return snapshot();const file=res.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('20MB 초과');const raw=await readFile(file,'utf8');const parsed=validatePackage(JSON.parse(raw));readPerformance(parsed);if(outputActive())throw new Error('공연 중에는 대본 변경 불가');const id=createHash('sha256').update(raw).digest('hex');await writeFile(path.join(dataDir(),id+'.json'),raw,{flag:'wx'}).catch(err=>{if(err.code!=='EEXIST')throw err});if(!versions.has(id))versions.set(id,await readWorking(id,parsed));notify();return snapshot()}finally{changingDeck=false}});
 ipcMain.handle('deck:edit-cue',async(e,expected,patch)=>{
  requireOperator(e);if(outputActive()||changingDeck||scaleChanging||widthChanging||active!==expected)throw Error('공연 종료 후 현재 대본을 다시 확인하세요.');
  if(styleLoadError||widthLoadError)throw Error('기존 자막 설정을 확인하세요.');
  changingDeck=true;
  try{
   assertWorking(active);assertEditBase(deck,patch);
   const candidate=editCueRevision(deck,patch),raw=JSON.stringify(candidate,null,2);
   if(Buffer.byteLength(raw)>20*1024*1024)throw Error('20MB 초과');
   const currentId=deck.frames[state.index]?.id;
   // Preserve the hashed import and library ID. Only one working file and one
   // previous-state backup per item, neither appears in the version list.
   await persistWorking(candidate);
   const index=currentId?deck.frames.findIndex(f=>f.id===currentId):-1;
   state={...state,index,blackout:state.blackout||index<0,sequence:state.sequence+1};
   notify();return snapshot();
  }finally{changingDeck=false}
 });
 ipcMain.handle('deck:delete-version',async(e,id,expectedActive)=>{
  requireOperator(e);if(changingDeck||widthChanging||scaleChanging)throw Error('다른 작업이 진행 중입니다.');
  assertVersionDelete(id,expectedActive,active,versions,outputActive());
  changingDeck=true;
  try{await unlink(path.join(dataDir(),id+'.json'));versions.delete(id);workingErrors.delete(id);notify();return snapshot()}finally{changingDeck=false}
 });
 ipcMain.handle('deck:export',async(e,expected)=>{
  requireOperator(e);if(outputActive()||changingDeck||widthChanging||scaleChanging||expected!==active)throw Error('공연 종료 후 현재 대본을 다시 확인하세요.');
  assertWorking(active);if(styleLoadError||widthLoadError)throw Error('기존 자막 설정을 확인하세요.');
  changingDeck=true;
  try{const result=await dialog.showSaveDialog(operator,{defaultPath:deck.title.replace(/[\\/:*?"<>|]/g,'_')+'.cuedeck.json',filters:[{name:'Cue Deck JSON',extensions:['json']}]});if(result.canceled)return {saved:false};
   const target=path.resolve(result.filePath);const relative=path.relative(path.resolve(app.getPath('userData')),target);
   if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw Error('앱 저장소 밖의 위치에 내보내세요.');
   await atomicJson(target,withPerformance(deck,settings(),captionWidths));return {saved:true};
  }finally{changingDeck=false}
 });
 ipcMain.handle('deck:compare',(e,id)=>{requireOperator(e);if(outputActive()||changingDeck||!versions.has(id))throw new Error('공연 종료 후 비교하세요');return {baseId:active,candidateId:id,...compareRevisions(deck,versions.get(id))}});
 ipcMain.handle('deck:activate',async(e,id,options)=>{requireOperator(e);if(outputActive()||changingDeck||widthChanging||scaleChanging||!versions.has(id))throw new Error('대본 변경 불가');assertWorking(id);assertActivation(active,deck,id,versions.get(id),options);changingDeck=true;try{const nextWidths=await loadWidths(id),nextStyle=await loadStyle(id);await persistActive(id);if(outputActive())throw new Error('공연 중에는 대본 변경 불가');active=id;deck=versions.get(id);captionWidths=nextWidths;widthLoadError='';captionSettings=nextStyle;styleLoadError='';state=playback(state,{type:'RESET'},deck.frames.length);notify();return snapshot()}finally{changingDeck=false}});
}
if(!app.requestSingleInstanceLock())app.quit();else app.whenReady().then(async()=>{await loadVersions();if(workingErrors.has(active)){outputError='편집 대본 읽기 실패';dialog.showErrorBox('Cue Deck · 편집 대본',workingErrors.get(active))}await loadScale();try{captionSettings=await loadStyle(active)}catch(e){styleLoadError=e.message;dialog.showErrorBox('Cue Deck · 자막 스타일',e.message)}try{captionWidths=await loadWidths(active)}catch(e){widthLoadError=e.message;dialog.showErrorBox('Cue Deck · 열 너비',e.message);captionWidths={}}register();operator=win({width:1440,height:900,minWidth:1000,minHeight:650,show:true,title:'Cue Deck'},'operator');loadWindow(operator,'operator').catch(err=>dialog.showErrorBox('Cue Deck',err.message));operator.on('closed',()=>{operator=null;stopOutput();app.quit()});app.on('second-instance',()=>operator?.focus());screen.on('display-removed',(_e,d)=>{if(d.id===displayId)stopOutput('선택한 디스플레이 연결이 해제되었습니다.');else notify()});screen.on('display-added',notify);screen.on('display-metrics-changed',(_e,d,metrics)=>{if(!localOnly&&d.id===displayId&&started&&metrics.some(m=>['bounds','rotation','scaleFactor'].includes(m))){if(!validPlacement(audience))stopOutput('송출 디스플레이 배치가 변경되었습니다.');else notify()}else notify()});});
app.on('window-all-closed',()=>app.quit());