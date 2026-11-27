// The operator's reading order is independent of the immutable audience cue list.
export function buildReaderSteps(deck){
 const anchors=new Map();
 deck.frames.forEach((frame,i)=>{const a=anchors.get(frame.blockId)||[];a.push(i);anchors.set(frame.blockId,a)});
 const steps=[];
 for(const b of deck.blocks){
  const indices=anchors.get(b.id);
  if(indices){for(const index of indices)steps.push({key:'cue:'+index,index,blockId:b.id,kind:'cue'});continue}
  if((b.kind==='dialogue'||b.kind==='nar')&&b.text.trim())steps.push({key:'read:'+b.id,index:null,blockId:b.id,kind:'hold'});
 }
 const positions=new Map(steps.map((s,i)=>[s.key,i]));
 return {steps,positions};
}
export function readerPosition(reader,index,holdKey){
 const key=holdKey??'cue:'+index;
 return reader.positions.get(key)??reader.positions.get('cue:'+index)??-1;
}
export function readerTarget(reader,index,holdKey,delta){
 const i=readerPosition(reader,index,holdKey)+delta;
 return i>=0&&i<reader.steps.length?reader.steps[i]:null;
}
