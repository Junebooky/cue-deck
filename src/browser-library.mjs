import {validatePackage,initialPlayback} from './model.mjs';
import {demo} from './demo.mjs';
import {readSettings} from './caption-style.mjs';
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
export async function readLibrary(){
 const saved=await get('versions');
 const versions=new Map([['demo',validatePackage(demo)]]);
 for(const item of Array.isArray(saved)?saved:[]){try{if(item.id!=='demo')versions.set(item.id,validatePackage(item.deck))}catch{}}
 const selected=await get('active');
 return {versions,active:versions.has(selected)?selected:'demo'};
}
function snapshot(lib,previous,reset=false){
 return {...previous,revision:previous.revision+1,active:lib.active,deck:lib.versions.get(lib.active),state:reset?{...initialPlayback(),sequence:previous.state.sequence+1}:previous.state,versions:[...lib.versions].map(([id,d])=>({id,title:d.title,revision:d.revision,count:d.frames.length}))};
}
export async function saveBrowserWidths(active,overrides){await put('caption-widths:'+active,overrides)}
export async function saveBrowserStyle(active,value){await put('caption-style:'+active,value)}
async function withWidths(s){const value=await get('caption-style:'+s.active);return {...s,captionWidths:await get('caption-widths:'+s.active)??{},captionSettings:value==null?null:readSettings(value)}}
export async function loadBrowserLibrary(previous){return withWidths(snapshot(await readLibrary(),previous,true))}
export async function importBrowserDeck(file,previous){
 if(!file)return previous;
 if(file.size>20*1024*1024)throw new Error('20MB 초과');
 const raw=await file.text();
 const deck=validatePackage(JSON.parse(raw.replace(/^\uFEFF/,'')));
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 const id=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
 const lib=await readLibrary();lib.versions.set(id,deck);
 await put('versions',[...lib.versions].filter(([k])=>k!=='demo').map(([id,deck])=>({id,deck})));
 return withWidths(snapshot(lib,previous));
}
export async function compareBrowserDeck(id){
 const lib=await readLibrary();if(!lib.versions.has(id))throw new Error('대본 버전을 찾을 수 없습니다');
 return {baseId:lib.active,candidateId:id,...compareRevisions(lib.versions.get(lib.active),lib.versions.get(id))};
}
export async function activateBrowserDeck(id,previous,options){
 const lib=await readLibrary();assertActivation(lib.active,lib.versions.get(lib.active),id,lib.versions.get(id),options);
 await put('active',id);lib.active=id;return withWidths(snapshot(lib,previous,true));
}
