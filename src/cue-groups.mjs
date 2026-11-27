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
// Legacy packages may lack sourceBlockIds. Only accept a unique exact text
// match starting at the existing anchor and ending before the next cue.
// Explicit reviewed membership always takes precedence.
const canon=s=>String(s??'').normalize('NFC').replace(/\s+/gu,'');
function lyricText(b){
 const text=b.text;
 // DOCX may include an explicit actor prefix in the original paragraph.
 const tab=text.indexOf('\t');
 return tab>=0&&canon(text.slice(0,tab))===canon(b.actor)&&canon(b.actor)?text.slice(tab+1):text;
}
function matchesFrame(frame,blocks){
 if(frame.kind==='solo'){
  if(blocks.some(b=>b.sourceCells))return false;
  return canon(blocks.map(lyricText).join('\n'))===canon(frame.columns[0].lines.join('\n'));
 }
 if(frame.kind==='overlap'){
  const n=frame.columns.length;
  if(blocks.some(b=>!Array.isArray(b.sourceCells)||b.sourceCells.length!==n))return false;
  const rows=lines=>lines.flatMap(line=>line.replace(/\r\n/g,'\n').split('\n')).map(canon);
  // Preserve empty rows, rather than accepting a shifted simultaneous vocal.
  return frame.columns.every((c,i)=>JSON.stringify(rows(c.lines))===JSON.stringify(rows(blocks.map(b=>b.sourceCells[i]))));
 }
 return false;
}
export function exactLegacyRange(deck,index,positions=new Map(deck.blocks.map((b,i)=>[b.id,i]))){
 const frame=deck.frames[index],start=positions.get(frame.blockId),anchor=deck.blocks[start];
 if(!anchor||!['solo','overlap'].includes(frame.kind))return anchor?[anchor.id]:null;
 const end=index+1<deck.frames.length?positions.get(deck.frames[index+1].blockId):deck.blocks.length;
 if(end===undefined||end<=start)return null;
 const candidates=[],range=[];
 for(let i=start;i<end;i++){
  const b=deck.blocks[i];
  if(b.kind!=='lyric'||b.sceneId!==anchor.sceneId||!canon(b.text))break;
  range.push(b);
  if(matchesFrame(frame,range))candidates.push(range.map(x=>x.id));
 }
 return candidates.length===1?candidates[0]:null;
}
export function buildCueGroups(deck){
 const at=new Map(),covered=new Set(),legacy=deck.frames.filter(f=>!Array.isArray(f.sourceBlockIds)).length;
 const positions=new Map(deck.blocks.map((b,i)=>[b.id,i]));
 const explicitOwners=new Set(deck.frames.flatMap(f=>f.sourceBlockIds||[]));
 let inferred=0,unresolved=0;
 const ranges=new Map();
 deck.frames.forEach((f,i)=>{
  let ids=f.sourceBlockIds;
  if(!ids){
   ids=exactLegacyRange(deck,i,positions);
   if(ids&&ids.some(id=>explicitOwners.has(id)))ids=null;
   if(!ids){unresolved++;ids=[f.blockId]}else inferred++;
  }
  ranges.set(i,ids);
  if(ids.length<2)return;
  at.set(ids[0],{key:f.id,index:i,ids});ids.forEach(id=>covered.add(id));
 });
 const byId=new Map(deck.blocks.map(b=>[b.id,b]));
 const units=[];
 for(const block of deck.blocks){
  const g=at.get(block.id);
  if(g)units.push({...g,blocks:g.ids.map(id=>byId.get(id))});
  else if(!covered.has(block.id))units.push({key:block.id,blocks:[block]});
 }
 return {units,legacy,inferred,unresolved,ranges};
}
