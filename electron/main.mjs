import {app,BrowserWindow,ipcMain,screen,dialog} from 'electron';
import {readFile,writeFile,mkdir,readdir,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePackage,initialPlayback,playback,viewFor} from '../src/model.mjs';
import {demo} from '../src/demo.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
let operator=null,audience=null,displayId=null,ready=false,ack=-1,deck=validatePackage(demo),state=initialPlayback(),versions=new Map([['demo',deck]]),active='demo';
let closing=false,ackTimer=null;
const dataDir=()=>path.join(app.getPath('userData'),'shows');
const snapshot=()=>({deck,state,active,versions:[...versions].map(([id,d])=>({id,title:d.title,revision:d.revision,count:d.frames.length})),output:{open:!!audience&&!audience.isDestroyed(),ready,displayId,ack}});
const output=()=>({sequence:state.sequence,view:viewFor(deck,state)});
const notify=()=>{if(operator&&!operator.isDestroyed())operator.webContents.send('deck:state-update',snapshot())};
function sendOutput(){if(!audience||audience.isDestroyed())return;clearTimeout(ackTimer);audience.webContents.send('deck:output',output());ackTimer=setTimeout(()=>{ready=false;notify()},1800)}
function requireOperator(e){if(!operator||e.sender!==operator.webContents)throw new Error('운영자 권한 필요')}
function requireAudience(e){if(!audience||e.sender!==audience.webContents)throw new Error('관객 창 권한 필요')}
function win(options,mode){const w=new BrowserWindow({...options,backgroundColor:'#000000',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());w.loadFile(path.join(here,'../dist/index.html'),{query:{mode}});return w}
function displays(){const primary=screen.getPrimaryDisplay().id;return screen.getAllDisplays().map(d=>({id:d.id,label:d.label||('Display '+d.id),primary:d.id===primary,width:d.bounds.width,height:d.bounds.height}))}
function stopOutput(){clearTimeout(ackTimer);ready=false;ack=-1;displayId=null;state=playback(state,{type:'BLACK'},deck.frames.length);const old=audience;audience=null;if(old&&!old.isDestroyed()){old.hide();old.destroy()}notify()}
async function loadVersions(){await mkdir(dataDir(),{recursive:true});for(const file of await readdir(dataDir())){if(!/^[a-f0-9]{64}\.json$/.test(file))continue;try{const raw=await readFile(path.join(dataDir(),file),'utf8');if(createHash('sha256').update(raw).digest('hex')!==file.slice(0,-5))continue;versions.set(file.slice(0,-5),validatePackage(JSON.parse(raw)))}catch{}}try{const saved=(await readFile(path.join(dataDir(),'active'),'utf8')).trim();if(versions.has(saved)){active=saved;deck=versions.get(saved)}}catch{}}
async function persistActive(id){const temp=path.join(dataDir(),'active.tmp');await writeFile(temp,id,'utf8');await rename(temp,path.join(dataDir(),'active'))}
function register(){
 ipcMain.handle('deck:state',e=>{requireOperator(e);return snapshot()});
 ipcMain.handle('deck:displays',e=>{requireOperator(e);return displays()});
 ipcMain.handle('deck:output-state',e=>{requireAudience(e);return output()});
 ipcMain.on('deck:ack',(e,seq)=>{if(!audience||e.sender!==audience.webContents||seq!==state.sequence)return;clearTimeout(ackTimer);ack=seq;ready=true;notify()});
 ipcMain.handle('deck:start',async(e,id)=>{requireOperator(e);if(audience)throw new Error('이미 송출 창이 열려 있습니다');const display=screen.getAllDisplays().find(d=>d.id===id);if(!display||id===screen.getDisplayMatching(operator.getBounds()).id)throw new Error('운영자와 다른 확장 디스플레이를 선택하세요');state=playback(state,{type:'RESET'},deck.frames.length);ready=false;ack=-1;displayId=id;const w=win({...display.bounds,show:false,frame:false,resizable:false,skipTaskbar:true,focusable:false,fullscreenable:true},'audience');audience=w;w.once('ready-to-show',()=>{if(audience!==w)return;w.setBounds(display.bounds);w.setFullScreen(true);w.showInactive();operator.focus();sendOutput();notify()});w.on('closed',()=>{if(audience===w){audience=null;ready=false;ack=-1;displayId=null;state=playback(state,{type:'BLACK'},deck.frames.length);notify()}});w.webContents.on('render-process-gone',()=>{if(audience===w)stopOutput()});notify();return snapshot()});
 ipcMain.handle('deck:stop',e=>{requireOperator(e);stopOutput();return snapshot()});
 ipcMain.handle('deck:command',(e,action)=>{requireOperator(e);if(!action||!['GO','PREV','BLACK','RESTORE'].includes(action.type))throw new Error('지원하지 않는 명령');if(action.type!=='BLACK'&&audience&&!ready)throw new Error('관객 화면 준비 확인 대기');state=playback(state,action,deck.frames.length);sendOutput();notify();return snapshot()});
 ipcMain.handle('deck:import',async e=>{requireOperator(e);if(audience)throw new Error('공연 종료 후 대본을 불러오세요');const res=await dialog.showOpenDialog(operator,{properties:['openFile'],filters:[{name:'Cue Deck JSON',extensions:['json']}]});if(res.canceled)return snapshot();const file=res.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('20MB 초과');const raw=await readFile(file,'utf8');const parsed=validatePackage(JSON.parse(raw));if(audience)throw new Error('공연 중에는 대본 변경 불가');const id=createHash('sha256').update(raw).digest('hex');await writeFile(path.join(dataDir(),id+'.json'),raw,{flag:'wx'}).catch(err=>{if(err.code!=='EEXIST')throw err});versions.set(id,parsed);notify();return snapshot()});
 ipcMain.handle('deck:activate',async(e,id)=>{requireOperator(e);if(audience||!versions.has(id))throw new Error('대본 변경 불가');await persistActive(id);if(audience)throw new Error('공연 중에는 대본 변경 불가');active=id;deck=versions.get(id);state=playback(state,{type:'RESET'},deck.frames.length);notify();return snapshot()});
}
if(!app.requestSingleInstanceLock())app.quit();else app.whenReady().then(async()=>{await loadVersions();register();operator=win({width:1440,height:900,minWidth:1000,minHeight:650,show:true,title:'Cue Deck'},'operator');operator.on('closed',()=>{operator=null;stopOutput();app.quit()});app.on('second-instance',()=>operator?.focus());screen.on('display-removed',(_e,d)=>{if(d.id===displayId)stopOutput();else notify()});screen.on('display-added',notify);screen.on('display-metrics-changed',(_e,d)=>{if(d.id===displayId)stopOutput();else notify()});});
app.on('window-all-closed',()=>app.quit());