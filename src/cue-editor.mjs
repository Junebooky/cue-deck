import {validatePackage} from './model.mjs';
import {buildCueGroups} from './cue-groups.mjs';
import {readPerformance} from './performance-data.mjs';
import {readHistory,restoreShowChange} from './show-history.mjs';
import {buildNumbers,validateNumberTitles} from './number-search.mjs';

// A cue edit updates the working copy in the same library slot. Source dialogue, runs and IDs are not rewritten.
export const editCount=deck=>Number.isSafeInteger(deck?.operatorEditCount)&&deck.operatorEditCount>=0?deck.operatorEditCount:0;
export function readWorkingDeck(base,value){
 const next=validatePackage(value);const performance=readPerformance(next);const history=readHistory(next);validateNumberTitles(next);
 if(next.productionId!==base.productionId||next.revision!==base.revision||next.title!==base.title||(!performance&&(!Number.isSafeInteger(next.operatorEditCount)||next.operatorEditCount<1))||(next.operatorEditCount!==undefined&&(!Number.isSafeInteger(next.operatorEditCount)||next.operatorEditCount<0))||JSON.stringify(next.blocks)!==JSON.stringify(base.blocks)||JSON.stringify(next.scenes)!==JSON.stringify(base.scenes)||(!history.entries.length&&(next.frames.length!==base.frames.length||next.frames.some(f=>!base.frames.some(b=>b.id===f.id)))))throw Error('저장된 편집 대본이 원본과 일치하지 않습니다.');
 return next;
}
export function assertEditBase(deck,patch){if(patch?.expectedEditCount!==editCount(deck))throw Error('대본이 이미 수정되었습니다. 다시 열어 주세요.');}
export function editableCueAnchors(deck,frameId){
 const index=deck.frames.findIndex(f=>f.id===frameId);
 if(index<0)throw Error('큐를 찾을 수 없습니다.');
 const frame=deck.frames[index],groups=buildCueGroups(deck),positions=new Map(deck.blocks.map((b,i)=>[b.id,i]));
 const source=deck.blocks[positions.get(frame.blockId)];
 const own=groups.ranges.get(index)??[frame.blockId];
 const occupied=new Set([...groups.ranges].filter(([i])=>i!==index).flatMap(([,ids])=>ids));
 const allowed=b=>b.sceneId===source.sceneId&&(b.number??'')===(source.number??'')&&!occupied.has(b.id)&&
   (frame.kind==='black'||(frame.kind==='place'?b.kind==='place':b.kind==='lyric'));
 return {own,anchors:deck.blocks.filter(allowed).map(b=>({id:b.id,text:b.text,actor:b.actor,kind:b.kind})),positions};
}
export function editCueRevision(deck,patch){
 const index=deck.frames.findIndex(f=>f.id===patch?.frameId);
 if(index<0)throw Error('큐를 찾을 수 없습니다.');
 const original=deck.frames[index],{own,anchors,positions}=editableCueAnchors(deck,original.id);
 const ids=patch.sourceBlockIds;
 if(!Array.isArray(ids)||!ids.length||ids.length>30)throw Error('대본 연결 범위를 선택하세요.');
 if(!ids.every(id=>typeof id==='string'&&anchors.some(b=>b.id===id))||
    ids.some((id,i)=>positions.get(id)!==positions.get(ids[0])+i))throw Error('같은 장면·넘버의 비어 있는 연속 대본 카드만 연결할 수 있습니다.');
 if((original.kind==='black'||original.kind==='place')&&ids.length!==1)throw Error('장소와 검정 화면은 한 카드만 연결하세요.');
 const trigger=patch.trigger;
 if(typeof trigger!=='string'||!trigger.trim()||trigger.length>4000)throw Error('GO TRIGGER를 입력하세요.');
 let columns=[],kind=original.kind;
 if(kind!=='black'){
  if(!Array.isArray(patch.columns)||!patch.columns.length||patch.columns.length>3)throw Error('가사 열 수를 확인하세요.');
  columns=patch.columns.map(c=>{
   if(typeof c?.actor!=='string'||c.actor.length>100||!Array.isArray(c.lines)||c.lines.length<1||c.lines.length>6||c.lines.some(l=>typeof l!=='string'||l.length>1000))throw Error('가사 열은 최대 6줄입니다.');
   return {actor:c.actor,lines:[...c.lines]};
  }).filter(c=>c.lines.some(l=>l.trim()));
  if(!columns.length)throw Error('빈 자막은 저장할 수 없습니다.');
  if(kind==='place'&&columns.length!==1)throw Error('장소 자막은 한 열만 가능합니다.');
  if(kind!=='place'){
   kind=columns.length===1?'solo':'overlap';
   if(kind==='solo')columns[0].lines=columns[0].lines.filter(l=>l.trim());
  }
  const rows=Math.max(...columns.map(c=>c.lines.length));
  columns=columns.map(c=>({...c,lines:[...c.lines,...Array(rows-c.lines.length).fill('')]}));
 }
 const unchanged=JSON.stringify({kind,columns,trigger,ids})===JSON.stringify({kind:original.kind,columns:original.columns,trigger:original.trigger,ids:own});
 if(unchanged)throw Error('변경된 내용이 없습니다.');
 const edited={...original,kind,columns,trigger,blockId:ids[0],sourceBlockIds:[...ids],operatorEdited:true};
 const next=structuredClone(deck);
 next.frames[index]=edited;
 next.frames.sort((a,b)=>positions.get(a.blockId)-positions.get(b.blockId));
 // Validate every existing group; a relocation cannot overlap another cue.
 next.operatorEditCount=editCount(deck)+1;
 return validatePackage(next);
}

export function freeCueAnchors(deck){
 const occupied=new Set([...buildCueGroups(deck).ranges.values()].flat());
 return deck.blocks.filter(b=>!occupied.has(b.id));
}
export function applyShowEdit(deck,patch){
 assertEditBase(deck,patch);
 if(patch.action==='undo'||patch.action==='redo')return restoreShowChange(deck,patch.action);
 if(patch.action==='rename-number'){
  const number=buildNumbers(deck).find(n=>n.key===patch.key);if(!number)throw Error('넘버를 찾을 수 없습니다.');
  const title=typeof patch.title==='string'?patch.title.trim():'';
  if(title.length>200||/[\r\n]/.test(title))throw Error('넘버 제목은 한 줄, 최대 200자입니다.');
  const titles={...deck.numberTitles};if(title)Object.defineProperty(titles,number.key,{value:title,enumerable:true,writable:true,configurable:true});else delete titles[number.key];
  const next={...deck,numberTitles:titles,operatorEditCount:editCount(deck)+1};validateNumberTitles(next);return validatePackage(next);
 }
 if(patch.action==='delete-cue'){
  if(deck.frames.length<=1||!deck.frames.some(f=>f.id===patch.frameId))throw Error('마지막 큐 또는 없는 큐는 삭제할 수 없습니다.');
  return validatePackage({...deck,frames:deck.frames.filter(f=>f.id!==patch.frameId),operatorEditCount:editCount(deck)+1});
 }
 if(patch.action==='add-cue'){
  const source=freeCueAnchors(deck).find(b=>b.id===patch.blockId);
  if(!source||typeof patch.frameId!=='string'||!/^operator-[a-zA-Z0-9-]{8,100}$/.test(patch.frameId)||deck.frames.some(f=>f.id===patch.frameId))throw Error('비어 있는 대본 위치를 다시 선택하세요.');
  const kind=patch.kind;if(!['solo','overlap','black','place'].includes(kind)||(kind==='place'&&source.kind!=='place')||(['solo','overlap'].includes(kind)&&source.kind!=='lyric'))throw Error('큐 유형과 원본 카드가 일치하지 않습니다.');
  if(typeof patch.trigger!=='string'||!patch.trigger.trim()||patch.trigger.length>4000)throw Error('GO TRIGGER를 입력하세요.');
  let columns=kind==='black'?[]:patch.columns;
  if(!Array.isArray(columns)||columns.some(c=>typeof c?.actor!=='string'||c.actor.length>100||!Array.isArray(c.lines)||c.lines.some(l=>typeof l!=='string'||l.length>1000)))throw Error('가사 내용 오류');
  const frame={id:patch.frameId,kind,blockId:source.id,sourceBlockIds:[source.id],trigger:patch.trigger.trim(),columns,operatorEdited:true};
  const positions=new Map(deck.blocks.map((b,i)=>[b.id,i]));
  return validatePackage({...deck,frames:[...deck.frames,frame].sort((a,b)=>positions.get(a.blockId)-positions.get(b.blockId)),operatorEditCount:editCount(deck)+1});
 }
 if(patch.action!==undefined&&patch.action!=='edit-cue')throw Error('지원하지 않는 대본 편집 명령');
 return editCueRevision(deck,patch);
}
export function showEditLabel(deck,patch){
 const n=deck.frames.findIndex(f=>f.id===patch.frameId),cue=n<0?'': 'CUE '+String(n+1).padStart(3,'0')+' · ';
 if(patch.action==='delete-cue')return cue+'큐 삭제';
 if(patch.action==='add-cue')return '큐 추가 · '+patch.trigger;
 if(patch.action==='rename-number')return '넘버 제목 · '+(buildNumbers(deck).find(n=>n.key===patch.key)?.label??'');
 return cue+'자막 및 송출 위치 수정';
}
