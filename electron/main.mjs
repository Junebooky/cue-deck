import {app,BrowserWindow,ipcMain,screen,dialog} from 'electron';
import {readFile,writeFile,mkdir,readdir,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePackage,initialPlayback,playback,viewFor} from '../src/model.mjs';
import {demo} from '../src/demo.mjs';
import {compareRevisions,assertActivation} from '../src/revision-review.mjs';
import {describeDisplays,selectOutputDisplay,coversDisplay,testView} from '../src/display-policy.mjs';
import {validScale,readScale,advanceStyleSequence} from '../src/caption-scale.mjs';
import {validFont,readFont,DEFAULT_FONT} from '../src/caption-fonts.mjs';
import {isNativeCueShortcut} from '../src/shortcuts.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
let operator=null,audience=null,displayId=null,ready=false,ack=-1,deck=validatePackage(demo),state=initialPlayback(),versions=new Map([['demo',deck]]),active='demo';
let ackTimer=null,startTimer=null,placementTimer=null,revision=0,changingDeck=false,outputError='',testing=false,started=false,ackDeadline=0;
const mac=process.platform==='darwin';
let captionScale=100,captionFont=DEFAULT_FONT,scaleChanging=false;
const scalePath=()=>path.join(app.getPath('userData'),'caption-scale.json');
async function loadScale(){try{const saved=JSON.parse(await readFile(scalePath(),'utf8'));captionScale=readScale(saved.scale);captionFont=readFont(saved.font)}catch{captionScale=100;captionFont=DEFAULT_FONT}}
const dataDir=()=>path.join(app.getPath('userData'),'shows');
const snapshot=()=>({revision:++revision,deck,state,active,captionScale,captionFont,versions:[...versions].map(([id,d])=>({id,title:d.title,revision:d.revision,count:d.frames.length})),output:{open:!!audience&&!audience.isDestroyed(),ready,displayId,ack,error:outputError,testing,testView:testing?output().view:null}});
const output=()=>({sequence:state.sequence,captionScale,captionFont,view:testing?testView(displays().find(d=>d.id===displayId)??{label:'Display',width:0,height:0}):viewFor(deck,state)});
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
function stopOutput(message=''){clearTimeout(ackTimer);clearTimeout(startTimer);clearInterval(placementTimer);ready=false;ack=-1;started=false;testing=false;outputError=message;displayId=null;state=playback(state,{type:'BLACK'},deck.frames.length);const old=audience;audience=null;if(old&&!old.isDestroyed()){old.hide();old.destroy()}notify()}
async function loadVersions(){await mkdir(dataDir(),{recursive:true});for(const file of await readdir(dataDir())){if(!/^[a-f0-9]{64}\.json$/.test(file))continue;try{const raw=await readFile(path.join(dataDir(),file),'utf8');if(createHash('sha256').update(raw).digest('hex')!==file.slice(0,-5))continue;versions.set(file.slice(0,-5),validatePackage(JSON.parse(raw)))}catch{}}try{const saved=(await readFile(path.join(dataDir(),'active'),'utf8')).trim();if(versions.has(saved)){active=saved;deck=versions.get(saved)}}catch{}}
async function persistActive(id){const temp=path.join(dataDir(),'active.tmp');await writeFile(temp,id,'utf8');await rename(temp,path.join(dataDir(),'active'))}
function register(){
 ipcMain.handle('deck:state',e=>{requireOperator(e);return snapshot()});
 ipcMain.handle('deck:displays',e=>{requireOperator(e);return displays()});
 ipcMain.handle('deck:output-state',e=>{requireAudience(e);return output()});
 ipcMain.on('deck:ack',(e,seq)=>{if(!audience||e.sender!==audience.webContents||seq!==state.sequence||!started||!validPlacement(audience))return;clearTimeout(ackTimer);ack=seq;ready=true;notify()});
 ipcMain.handle('deck:start',async(e,id)=>{
  requireOperator(e);if(audience||changingDeck||scaleChanging)throw new Error('송출 창 또는 대본 변경 작업이 진행 중입니다');
  const display=selectOutputDisplay(screen.getAllDisplays(),id,screen.getDisplayMatching(operator.getBounds()).id);
  state=playback(state,{type:'RESET'},deck.frames.length);ready=false;ack=-1;displayId=id;started=false;testing=false;outputError='';
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
  if(scaleChanging||changingDeck||(audience&&!ready))throw new Error('진행 중인 작업 또는 관객 화면 응답을 확인하세요.');
  if(value===captionScale)return snapshot();
  scaleChanging=true;
  try{
   const temp=scalePath()+'.tmp';
   await writeFile(temp,JSON.stringify({scale:value,font:captionFont}),'utf8');await rename(temp,scalePath());
   captionScale=value;state=advanceStyleSequence(state);sendOutput();notify();return snapshot();
  }finally{scaleChanging=false}
 });
 ipcMain.handle('deck:caption-font',async(e,value)=>{
  requireOperator(e);
  if(!validFont(value))throw new Error('지원하지 않는 자막 폰트');
  if(scaleChanging||changingDeck||(audience&&!ready))throw new Error('진행 중인 작업 또는 관객 화면 응답을 확인하세요.');
  if(value===captionFont)return snapshot();
  scaleChanging=true;
  try{
   const temp=scalePath()+'.tmp';
   await writeFile(temp,JSON.stringify({scale:captionScale,font:value}),'utf8');await rename(temp,scalePath());
   captionFont=value;state=advanceStyleSequence(state);sendOutput();notify();return snapshot();
  }finally{scaleChanging=false}
 });
 ipcMain.handle('deck:test-output',(e,enabled)=>{requireOperator(e);if(!audience||!started||!ready)throw new Error('관객 화면 연결 확인 후 테스트하세요');testing=enabled===true;state=playback(state,{type:'BLACK'},deck.frames.length);sendOutput();notify();return snapshot()});
 ipcMain.handle('deck:command',(e,action)=>{requireOperator(e);if(!action||!['GO','PREV','BLACK','RESTORE'].includes(action.type))throw new Error('지원하지 않는 명령');if(testing&&action.type!=='BLACK')throw new Error('화면 테스트를 종료한 후 송출하세요');if(action.type!=='BLACK'&&audience&&!ready)throw new Error('관객 화면 준비 확인 대기');if(action.type==='BLACK')testing=false;state=playback(state,action,deck.frames.length);sendOutput();notify();return snapshot()});
 ipcMain.handle('deck:import',async e=>{requireOperator(e);if(audience||changingDeck)throw new Error('공연 종료 및 기존 작업 완료 후 대본을 불러오세요');changingDeck=true;try{const res=await dialog.showOpenDialog(operator,{properties:['openFile'],filters:[{name:'Cue Deck JSON',extensions:['json']}]});if(res.canceled)return snapshot();const file=res.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('20MB 초과');const raw=await readFile(file,'utf8');const parsed=validatePackage(JSON.parse(raw));if(audience)throw new Error('공연 중에는 대본 변경 불가');const id=createHash('sha256').update(raw).digest('hex');await writeFile(path.join(dataDir(),id+'.json'),raw,{flag:'wx'}).catch(err=>{if(err.code!=='EEXIST')throw err});versions.set(id,parsed);notify();return snapshot()}finally{changingDeck=false}});
 ipcMain.handle('deck:compare',(e,id)=>{requireOperator(e);if(audience||changingDeck||!versions.has(id))throw new Error('공연 종료 후 비교하세요');return {baseId:active,candidateId:id,...compareRevisions(deck,versions.get(id))}});
 ipcMain.handle('deck:activate',async(e,id,options)=>{requireOperator(e);if(audience||changingDeck||!versions.has(id))throw new Error('대본 변경 불가');assertActivation(active,deck,id,versions.get(id),options);changingDeck=true;try{await persistActive(id);if(audience)throw new Error('공연 중에는 대본 변경 불가');active=id;deck=versions.get(id);state=playback(state,{type:'RESET'},deck.frames.length);notify();return snapshot()}finally{changingDeck=false}});
}
if(!app.requestSingleInstanceLock())app.quit();else app.whenReady().then(async()=>{await loadVersions();await loadScale();register();operator=win({width:1440,height:900,minWidth:1000,minHeight:650,show:true,title:'Cue Deck'},'operator');loadWindow(operator,'operator').catch(err=>dialog.showErrorBox('Cue Deck',err.message));operator.on('closed',()=>{operator=null;stopOutput();app.quit()});app.on('second-instance',()=>operator?.focus());screen.on('display-removed',(_e,d)=>{if(d.id===displayId)stopOutput('선택한 디스플레이 연결이 해제되었습니다.');else notify()});screen.on('display-added',notify);screen.on('display-metrics-changed',(_e,d,metrics)=>{if(d.id===displayId&&started&&metrics.some(m=>['bounds','rotation','scaleFactor'].includes(m))){if(!validPlacement(audience))stopOutput('송출 디스플레이 배치가 변경되었습니다.');else notify()}else notify()});});
app.on('window-all-closed',()=>app.quit());