// Explicit reviewed source membership. Never guess from adjacent or repeated lyrics.
export function validateCueGroups(deck){
 const positions=new Map(deck.blocks.map((b,i)=>[b.id,i]));
 const owners=new Map();
 let previousEnd=-1;
 for(const frame of deck.frames){
  const explicit=frame.sourceBlockIds!==undefined;
  const ids=explicit?frame.sourceBlockIds:[frame.blockId];
  if(!Array.isArray(ids)||!ids.length||ids[0]!==frame.blockId||new Set(ids).size!==ids.length)throw new Error('큐 그룹 시작 위치 오류: '+frame.id);
  const start=positions.get(frame.blockId);
  if(!explicit){
   if(owners.has(frame.blockId))throw new Error('큐 그룹 중복: '+frame.id);
   previousEnd=Math.max(previousEnd,start);continue;
  }
  if(start<=previousEnd)throw new Error('큐 그룹 순서 또는 중복 오류: '+frame.id);
  if(['black','place'].includes(frame.kind)&&ids.length!==1)throw new Error('장소/검정 큐는 단일 앵커 필요: '+frame.id);
  for(let j=0;j<ids.length;j++){
   const index=positions.get(ids[j]),b=deck.blocks[index];
   if(index!==start+j||!b||b.sceneId!==deck.blocks[start].sceneId||owners.has(ids[j]))throw new Error('큐 그룹 원본 범위 오류: '+frame.id);
   if(['solo','overlap'].includes(frame.kind)&&b.kind!=='lyric')throw new Error('가사 큐에 드라마/무대 지시 포함 불가: '+frame.id);
   owners.set(ids[j],frame.id);
  }
  previousEnd=start+ids.length-1;
 }
}
export function buildCueGroups(deck){
 const at=new Map(),covered=new Set(),legacy=deck.frames.filter(f=>!Array.isArray(f.sourceBlockIds)).length;
 deck.frames.forEach((f,i)=>{
  const ids=f.sourceBlockIds;
  if(!ids||ids.length<2)return;
  at.set(ids[0],{key:f.id,index:i,ids});ids.forEach(id=>covered.add(id));
 });
 const byId=new Map(deck.blocks.map(b=>[b.id,b]));
 const units=[];
 for(const block of deck.blocks){
  const g=at.get(block.id);
  if(g)units.push({...g,blocks:g.ids.map(id=>byId.get(id))});
  else if(!covered.has(block.id))units.push({key:block.id,blocks:[block]});
 }
 return {units,legacy};
}
