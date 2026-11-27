import {validatePackage} from './model.mjs';
import {buildCueGroups} from './cue-groups.mjs';

// A cue edit is a new immutable revision. Source dialogue, runs and IDs are not rewritten.
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
 next.revision=deck.revision+' · 큐 편집 '+original.id;
 return validatePackage(next);
}
