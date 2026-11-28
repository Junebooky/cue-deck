import {validatePackage,initialPlayback} from './model.mjs';
import {editCueRevision,readWorkingDeck,assertEditBase} from './cue-editor.mjs';
import {demo} from './demo.mjs';
import {readSettings} from './caption-style.mjs';
import {readPerformance,withPerformance} from './performance-data.mjs';
import {assertVersionDelete} from './version-delete.mjs';
import {compareRevisions,assertActivation} from './revision-review.mjs';
// Browser rehearsal storage is independent of the Electron production library.
const openDB=()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('cue-deck-rehearsal-v1',1);
 req.onupgradeneeded=()=>{req.result.createObjectStore('library')};
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error||new Error('로컬 대본 저장소를 열 수 없습니다'));
 req.onblocked=()=>reject(new Error('다른 Cue Deck 탭을 닫고 다시 시도하세요'));
});
async function access(mode,fn){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('library',mode),store=tx.objectStore('library');
  const request=fn(store);tx.oncomplete=()=>resolve(request?.result);
  tx.onerror=()=>reject(tx.error||new Error('로컬 저장 실패'));
  tx.onabort=()=>reject(tx.error||new Error('로컬 저장 취소'));
 })}finally{db.close()}
}
const get=key=>access('readonly',s=>s.get(key));
const put=(key,value)=>access('readwrite',s=>s.put(value,key));
export async function readLibrary(includeWorking=true){
 const saved=await get('versions');
 const versions=new Map([['demo',validatePackage(demo)]]);
 for(const item of Array.isArray(saved)?saved:[]){try{if(item.id!=='demo')versions.set(item.id,validatePackage(item.deck))}catch{}}
 if(includeWorking)for(const [id,base] of versions){const working=await get('working:'+id);if(working!==undefined)versions.set(id,readWorkingDeck(base,working.current))}
 const selected=await get('active');
 return {versions,active:versions.has(selected)?selected:'demo'};
}
function snapshot(lib,previous,reset=false){
 return {...previous,revision:previous.revision+1,active:lib.active,deck:lib.versions.get(lib.active),state:reset?{...initialPlayback(),sequence:previous.state.sequence+1}:previous.state,versions:[...lib.versions].map(([id,d])=>({id,title:d.title,revision:d.revision,count:d.frames.length}))};
}
export async function saveBrowserWidths(active,overrides,previous){return saveWorking(active,previous,null,overrides)}
export async function saveBrowserStyle(active,value,previous){return saveWorking(active,previous,value,null)}
async function withWidths(s){const embedded=readPerformance(s.deck);if(embedded)return {...s,captionSettings:embedded.captionSettings,captionWidths:embedded.captionWidths};const value=await get('caption-style:'+s.active);return {...s,captionWidths:await get('caption-widths:'+s.active)??{},captionSettings:value==null?null:readSettings(value)}}
export async function loadBrowserLibrary(previous){return withWidths(snapshot(await readLibrary(),previous,true))}
export async function importBrowserDeck(file,previous){
 if(!file)return previous;
 if(file.size>20*1024*1024)throw new Error('20MB 초과');
 const raw=await file.text();
 const deck=validatePackage(JSON.parse(raw.replace(/^\uFEFF/,'')));readPerformance(deck);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 const id=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
 const lib=await readLibrary(false);if(!lib.versions.has(id))lib.versions.set(id,deck);
 await put('versions',[...lib.versions].filter(([k])=>k!=='demo').map(([id,deck])=>({id,deck})));
 return withWidths(snapshot(await readLibrary(),previous));
}
export async function editBrowserCue(expected,patch,previous){return saveWorking(expected,previous,null,null,patch)}
async function saveWorking(expected,previous,style,widths,patch=null){
 if(previous.active!==expected||previous.output.open)throw Error('현재 대본을 다시 확인하세요.');
 // One read/write transaction checks the active slot and edit generation, then
 // atomically replaces its working copy and bounded backup. Other tabs cannot
 // overwrite a newer edit using an old editor form.
 const db=await openDB();
 let candidate;
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('library','readwrite'),store=tx.objectStore('library');
  const selected=store.get('active'),saved=store.get('versions'),working=store.get('working:'+expected);
  let pending=3,error=null;
  const finish=()=>{if(--pending)return;try{
   const versions=new Map([['demo',validatePackage(demo)]]);
   for(const item of Array.isArray(saved.result)?saved.result:[]){if(item.id!=='demo')versions.set(item.id,validatePackage(item.deck))}
   const active=versions.has(selected.result)?selected.result:'demo';
   if(active!==expected)throw Error('현재 대본이 변경되었습니다.');
   const base=versions.get(active);
   const current=working.result===undefined?base:readWorkingDeck(base,working.result.current);
   assertEditBase(current,{expectedEditCount:previous.deck.operatorEditCount??0});
   if(JSON.stringify(current.performanceSettings)!==JSON.stringify(previous.deck.performanceSettings))throw Error('공연 설정이 이미 수정되었습니다. 다시 열어 주세요.');
   if(patch)assertEditBase(current,patch);
   const old=readPerformance(current),oldStyle=old?.captionSettings??readSettings(previous.captionSettings,previous.captionFont,previous.captionScale),oldWidths=old?.captionWidths??previous.captionWidths??{};
   candidate=withPerformance(patch?editCueRevision(current,patch):current,style??oldStyle,widths??oldWidths);
   if(new TextEncoder().encode(JSON.stringify(candidate)).length>20*1024*1024)throw Error('20MB 초과');
   store.put({current:candidate,previous:withPerformance(current,oldStyle,oldWidths)},'working:'+active);
  }catch(e){error=e;tx.abort()}};
  for(const request of [selected,saved,working])request.onsuccess=finish;
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(error||tx.error||Error('편집 저장 실패'));
  tx.onabort=()=>reject(error||tx.error||Error('편집 저장 취소'));
 })}finally{db.close()}
 const currentId=previous.deck.frames[previous.state.index]?.id;
 const index=currentId?candidate.frames.findIndex(f=>f.id===currentId):-1;
 return {...previous,revision:previous.revision+1,deck:candidate,captionSettings:candidate.performanceSettings.captionSettings,captionWidths:candidate.performanceSettings.captionWidths,
  state:patch?{...previous.state,index,blackout:previous.state.blackout||index<0,sequence:previous.state.sequence+1}:previous.state};
}
export async function compareBrowserDeck(id){
 const lib=await readLibrary();if(!lib.versions.has(id))throw new Error('대본 버전을 찾을 수 없습니다');
 return {baseId:lib.active,candidateId:id,...compareRevisions(lib.versions.get(lib.active),lib.versions.get(id))};
}
export async function activateBrowserDeck(id,previous,options){
 const lib=await readLibrary();assertActivation(lib.active,lib.versions.get(lib.active),id,lib.versions.get(id),options);
 await put('active',id);lib.active=id;return withWidths(snapshot(lib,previous,true));
}

export async function deleteBrowserDeck(id,expectedActive,previous){
 const db=await openDB();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('library','readwrite'),store=tx.objectStore('library');
  let failure;
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(failure??tx.error??Error('대본 삭제 실패'));
  tx.onabort=()=>reject(failure??tx.error??Error('대본 삭제 취소'));
  const saved=store.get('versions'),activeReq=store.get('active');
  activeReq.onsuccess=()=>{
   try{
    const entries=Array.isArray(saved.result)?saved.result:[];
    const versions=new Map([['demo',demo],...entries.map(v=>[v.id,v.deck])]);
    const active=versions.has(activeReq.result)?activeReq.result:'demo';
    assertVersionDelete(id,expectedActive,active,versions);
    store.put(entries.filter(v=>v.id!==id),'versions');
   }catch(e){failure=e;tx.abort()}
  };
 })}finally{db.close()}
 return withWidths(snapshot(await readLibrary(),previous));
}
