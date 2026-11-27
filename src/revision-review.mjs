// Compare declared identities only; never silently infer lyric correspondence.
const encode=v=>JSON.stringify(v);
const same=(a,b)=>encode(a)===encode(b);
const fields=(obj,names)=>Object.fromEntries(names.map(k=>[k,obj[k]??null]));
const sceneFields=['act','label','number','numbers'];
const blockFields=['sceneId','kind','actor','text','sourceCells','runs','cellRuns','number'];
const cueFields=['blockId','kind','trigger','columns'];
function diffList(oldList,newList,category,keys,describe,extra=()=>[]){
 const oldMap=new Map(oldList.map((x,i)=>[x.id,{x,i}])),newMap=new Map(newList.map((x,i)=>[x.id,{x,i}]));
 const oldShared=oldList.filter(x=>newMap.has(x.id)).map(x=>x.id),newShared=newList.filter(x=>oldMap.has(x.id)).map(x=>x.id);
 const oldRanks=new Map(oldShared.map((id,i)=>[id,i])),newRanks=new Map(newShared.map((id,i)=>[id,i]));
 const changes=[];
 for(const x of oldList){
  const before=oldMap.get(x.id),after=newMap.get(x.id);
  if(!after){changes.push({category,id:x.id,status:'removed',before:describe(x,before.i,'old'),after:null,fields:[]});continue}
  const changed=keys.filter(k=>!same(x[k]??null,after.x[k]??null));
  changed.push(...extra(x,after.x));
  const moved=oldRanks.get(x.id)!==newRanks.get(x.id);
  if(changed.length||moved)changes.push({category,id:x.id,status:changed.length?'changed':'moved',moved,fields:[...new Set(changed)],before:describe(x,before.i,'old'),after:describe(after.x,after.i,'new')});
 }
 for(const x of newList)if(!oldMap.has(x.id))changes.push({category,id:x.id,status:'added',before:null,after:describe(x,newMap.get(x.id).i,'new'),fields:[]});
 return changes;
}
const blockDescription=(x,i)=>({position:i+1,kind:x.kind,actor:x.actor,sceneId:x.sceneId,text:x.text,cells:x.sourceCells??null,runs:x.runs??null,cellRuns:x.cellRuns??null});
const cueDescription=(x,i,block)=>({position:i+1,kind:x.kind,actor:x.columns.map(c=>c.actor).filter(Boolean).join(' / '),text:x.columns.map(c=>c.lines.join('\n')).join('\n—\n'),trigger:x.trigger,blockId:x.blockId,anchor:block?{kind:block.kind,actor:block.actor,text:block.text}:null,columns:x.columns});
const sceneDescription=(x,i)=>({position:i+1,kind:'scene',text:x.label,actor:'ACT '+x.act,number:x.numbers??x.number??null});
export function compareRevisions(previous,next){
 if(previous.productionId!==next.productionId)return {comparable:false,changes:[],counts:null,totals:{before:previous.frames.length,after:next.frames.length},beforeRevision:previous.revision,afterRevision:next.revision};
 const oldBlocks=new Map(previous.blocks.map(b=>[b.id,b])),newBlocks=new Map(next.blocks.map(b=>[b.id,b]));
 const anchor=(b)=>b?fields(b,['sceneId','kind','actor','text','sourceCells']):null;
 const changes=[
 ...diffList(previous.scenes,next.scenes,'scene',sceneFields,sceneDescription),
 ...diffList(previous.blocks,next.blocks,'block',blockFields,blockDescription),
 ...diffList(previous.frames,next.frames,'cue',cueFields,(x,i,side)=>cueDescription(x,i,(side==='old'?oldBlocks:newBlocks).get(x.blockId)),(a,b)=>same(anchor(oldBlocks.get(a.blockId)),anchor(newBlocks.get(b.blockId)))?[]:['anchorContent'])
 ];
 const counts={};for(const category of ['scene','block','cue']){const c={added:0,removed:0,changed:0,moved:0};for(const x of changes)if(x.category===category)c[x.status]++;counts[category]=c}
 return {comparable:true,changes,counts,totals:{before:previous.frames.length,after:next.frames.length},beforeRevision:previous.revision,afterRevision:next.revision};
}
export function assertActivation(currentId,current,candidateId,candidate,options={}){
 if(!candidate)throw new Error('대본 버전을 찾을 수 없습니다');
 if(options.expectedActive!==currentId)throw new Error('사용 중인 대본이 변경되었습니다. 다시 비교하세요.');
 if(candidateId!==currentId&&current.productionId===candidate.productionId&&options.reviewed!==true)throw new Error('동일 작품의 버전 변경은 비교 검토가 필요합니다.');
}
