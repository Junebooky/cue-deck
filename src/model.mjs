import {validateCueGroups} from './cue-groups.mjs';
// One validated package is the unit of revision. IDs are not display numbers.
export function validatePackage(p) {
  const fail = (m) => {throw new Error(m)};
  const str = (v) => typeof v==='string' && v.trim().length>0;
  if (!p || p.schemaVersion!==1 || !str(p.productionId) || !str(p.title) || !str(p.revision)) fail('잘못된 공연 데이터 형식');
  for (const k of ['scenes','blocks','frames']) if (!Array.isArray(p[k]) || !p[k].length) fail(k+' 배열 필요');
  const ids=(items,k)=>{const seen=new Set();for(const x of items){if(!x||!str(x.id)||seen.has(x.id))fail(k+' ID 중복 또는 누락');seen.add(x.id)}return seen};
  const scenes=ids(p.scenes,'scene'), blocks=ids(p.blocks,'block'); ids(p.frames,'frame');
  const kinds=['lyric','dialogue','nar','direction','place','heading'];
  for(const s of p.scenes) if(![1,2].includes(s.act)||!str(s.label))fail('장면 정보 오류');
  for(const b of p.blocks) {if(!scenes.has(b.sceneId)||!kinds.includes(b.kind)||typeof b.text!=='string'||typeof b.actor!=='string')fail('대본 블록 오류: '+b.id);if(b.sourceCells!==undefined&&(!Array.isArray(b.sourceCells)||b.sourceCells.length<1||!b.sourceCells.every(c=>typeof c==='string')))fail('원본 표 셀 오류: '+b.id)}
  // Source runs are optional for old packages, but may never change the original source text.
  const validRuns=(runs,text)=>Array.isArray(runs)&&runs.every(r=>r&&typeof r.text==='string'&&['bold','red','italic'].every(k=>r[k]===undefined||typeof r[k]==='boolean'))&&runs.map(r=>r.text).join('')===text;
  for(const b of p.blocks){
    if(b.runs!==undefined&&!validRuns(b.runs,b.text))fail('원본 문단 서식 불일치: '+b.id);
    if(b.cellRuns!==undefined&&(!Array.isArray(b.sourceCells)||!Array.isArray(b.cellRuns)||b.cellRuns.length!==b.sourceCells.length||!b.cellRuns.every((r,i)=>validRuns(r,b.sourceCells[i]))))fail('원본 표 서식 불일치: '+b.id);
  }
  let last=-1;
  for(const f of p.frames){
    const i=p.blocks.findIndex(b=>b.id===f.blockId);
    if(!blocks.has(f.blockId)||i<last||!['solo','overlap','place','black'].includes(f.kind)||!str(f.trigger))fail('큐 연결 또는 순서 오류: '+f.id);
    last=i;
    if(!Array.isArray(f.columns))fail('columns 필요');
    const n=f.columns.length;
    if(f.kind==='black'?n!==0:f.kind==='overlap'?n<2||n>3:n!==1)fail('열 개수 오류: '+f.id);
    let rows;
    for(const c of f.columns){
      if(typeof c.actor!=='string'||!Array.isArray(c.lines)||c.lines.length<1||c.lines.length>6||!c.lines.every(x=>typeof x==='string'))fail('가사 열 오류: '+f.id);
      if(rows!==undefined&&rows!==c.lines.length)fail('빈 행 포함 좌우 행 수 일치 필요: '+f.id);
      rows=c.lines.length;
    }
    if(f.kind!=='black'&&!f.columns.some(c=>c.lines.some(str)))fail('모든 열이 비어 있음: '+f.id);
    if(f.kind==='overlap'&&f.columns.some(c=>!str(c.actor)))fail('동시 가창 화자 필요');
    if(f.kind==='place'&&p.blocks[i].kind!=='place')fail('장소 큐 원본 불일치');
    if(['solo','overlap'].includes(f.kind)&&p.blocks[i].kind!=='lyric')fail('가사 큐 원본 불일치');
  }
  validateCueGroups(p);
  return structuredClone(p);
}
export const initialPlayback=()=>({index:-1,blackout:true,sequence:0});
export function playback(state,action,count){
  const next=(index,blackout)=>({...state,index,blackout,sequence:state.sequence+1});
  switch(action.type){
    case 'GO':{const i=action.index??state.index+1;return Number.isInteger(i)&&i>=0&&i<count?next(i,false):state}
    case 'PREV':return state.index>0?next(state.index-1,false):state;
    case 'BLACK':return next(state.index,true);
    case 'RESTORE':return state.index>=0?next(state.index,false):state;
    case 'RESET':return next(-1,true);
    default:return state;
  }
}
export function viewFor(deck,state){const f=deck.frames[state.index];return state.blackout||!f||f.kind==='black'?{kind:'black',columns:[]}:{kind:f.kind,columns:f.columns}}
