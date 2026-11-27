// Operator notes are deliberately independent of the playback model and show data.
export const EMPTY_LOG={schemaVersion:1,sessions:[],notes:[]};
export const NOTE_LABELS={lyric:'가사',overlap:'동시 가창',dialogue:'드라마',nar:'NAR',place:'장소',black:'검정 전환',other:'기타'};
export function readLog(raw){
 if(raw===null)return structuredClone(EMPTY_LOG);
 const value=JSON.parse(raw);
 if(value?.schemaVersion!==1||!Array.isArray(value.sessions)||!Array.isArray(value.notes))throw Error('리허설 기록 형식을 읽을 수 없습니다. 기존 기록을 덮어쓰지 않습니다.');
 return value;
}
export function currentTarget(deck,active,index,holdStep,ranges){
 const frame=deck.frames[index];
 const blockId=holdStep?.blockId??frame?.blockId;
 const block=deck.blocks.find(b=>b.id===blockId);
 if(!block)return null;
 const scene=deck.scenes.find(s=>s.id===block.sceneId);
 const ids=holdStep?[blockId]:(ranges?.get(index)??[blockId]);
 const members=ids.map(id=>deck.blocks.find(b=>b.id===id)).filter(Boolean);
 const actors=[...new Set([...members.flatMap(b=>b.actor?[b.actor]:[]),...(!holdStep?frame.columns.map(c=>c.actor).filter(Boolean):[])])];
 const kind=holdStep?block.kind:frame.kind==='overlap'?'overlap':frame.kind==='solo'?'lyric':frame.kind==='place'?'place':['dialogue','nar'].includes(block.kind)?block.kind:'black';
 const position=deck.blocks.indexOf(block);
 const heading=deck.blocks.slice(0,position+1).reverse().find(b=>b.sceneId===block.sceneId&&b.kind==='heading'&&b.number);
 return {key:holdStep?'read:'+blockId:'cue:'+frame.id,active,productionId:deck.productionId,revision:deck.revision,title:deck.title,blockId,sourceBlockIds:ids,sourceRef:block.sourceRef??null,cueId:holdStep?null:frame.id,cueNumber:holdStep?null:index+1,kind:NOTE_LABELS[kind]?kind:'other',actors,act:scene?.act??null,sceneId:block.sceneId,scene:scene?.label??block.sceneId,number:block.number??heading?.number??scene?.number??'',original:members.map(b=>b.text).join('\n'),source:members.map(b=>({id:b.id,actor:b.actor,text:b.text,cells:b.sourceCells??null,sourceRef:b.sourceRef??null})),caption:holdStep?[]:frame.columns};
}
export function startSession(log,deck,active,id,now){
 const session={id,active,productionId:deck.productionId,title:deck.title,revision:deck.revision,startedAt:now,endedAt:null};
 return {...log,sessions:[...log.sessions,session]};
}
export function endSession(log,id,now){
 return {...log,sessions:log.sessions.map(s=>s.id===id&&!s.endedAt?{...s,endedAt:now}:s)};
}
export function markNote(log,sessionId,target,id,now){
 const session=log.sessions.find(s=>s.id===sessionId);
 if(!session||session.endedAt||!target||session.active!==target.active)throw Error('현재 대본의 리허설을 시작하세요.');
 const event={id,at:now,elapsedMs:Math.max(0,now-session.startedAt)};
 const existing=log.notes.find(n=>n.sessionId===sessionId&&n.key===target.key);
 const note=existing?{...existing,resolved:false,events:[...existing.events,event]}:{...target,id,sessionId,events:[event],memo:'',actual:'',detail:'',resolved:false};
 return {...log,notes:existing?log.notes.map(n=>n.id===note.id?note:n):[...log.notes,note]};
}
export function undoMark(log,sessionId){
 const notes=log.notes.filter(n=>n.sessionId===sessionId&&n.events.length);
 const last=notes.reduce((best,n)=>!best||n.events.at(-1).at>=best.events.at(-1).at?n:best,null);
 if(!last)return log;
 return {...log,notes:log.notes.flatMap(n=>n.id!==last.id?[n]:n.events.length>1?[{...n,events:n.events.slice(0,-1)}]:[])};
}
export function editNote(log,id,patch){
 return {...log,notes:log.notes.map(n=>n.id!==id?n:{...n,...Object.fromEntries(['memo','actual','detail','resolved'].filter(k=>Object.hasOwn(patch,k)).map(k=>[k,k==='resolved'?patch[k]===true:String(patch[k]).slice(0,10000)]))})};
}
// Append a new observation without overwriting earlier notes at the same cue.
export function appendNoteMemo(log,id,value){
 const note=log.notes.find(n=>n.id===id);
 if(!note)throw Error('해당 오류 기록을 찾을 수 없습니다.');
 const entry=String(value??'').trim();
 if(!entry)return log;
 const memo=[note.memo,entry].filter(Boolean).join('\n');
 if(memo.length>10000)throw Error('메모는 최대 10,000자까지 저장할 수 있습니다.');
 return editNote(log,id,{memo});
}
export function repeatCount(log,note){
 return log.notes.filter(n=>n.productionId===note.productionId&&n.active===note.active&&n.key===note.key).reduce((sum,n)=>sum+n.events.length,0);
}
export function elapsed(ms){const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')}
const safeCsv=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
export function exportNotes(notes,sessions){
 const header=['회차','대본 버전','막','장면','넘버','큐','유형','등장인물','원본','실제 발화','오류 상세','메모','발생 횟수','발생 시각','경과 시간','상태','원본 ID'];
 const rows=notes.map(n=>[new Date(sessions.find(s=>s.id===n.sessionId)?.startedAt??n.events[0].at).toLocaleString('ko-KR'),n.revision,n.act,n.scene,Array.isArray(n.number)?n.number.join(' / '):n.number,n.cueNumber,NOTE_LABELS[n.kind],n.actors.join(' / '),n.original,n.actual,n.detail,n.memo,n.events.length,n.events.map(e=>new Date(e.at).toISOString()).join(' / '),n.events.map(e=>elapsed(e.elapsedMs)).join(' / '),n.resolved?'확인 완료':'미해결',n.sourceBlockIds.join(' / ')]);
 return '\uFEFF'+[header,...rows].map(row=>row.map(safeCsv).join(',')).join('\r\n');
}
