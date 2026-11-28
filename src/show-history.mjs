import {validatePackage} from './model.mjs';
import {readPerformance} from './performance-data.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const own=(o,k)=>Object.hasOwn(o??{},k);
export function readHistory(deck){
 const h=deck.showHistory;
 if(h===undefined)return {version:1,entries:[],undo:[],redo:[]};
 if(!h||h.version!==1||!Array.isArray(h.entries)||!Array.isArray(h.undo)||!Array.isArray(h.redo))throw Error('수정 이력 형식 오류');
 const changes=new Set();
 h.entries.forEach((e,i)=>{
  if(!e||!['change','undo','redo'].includes(e.type)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||typeof e.label!=='string')throw Error('수정 이력 항목 오류');
  if(e.type==='change'){
   if(!Array.isArray(e.frames)||e.frames.some(d=>!d||typeof d.id!=='string'||(d.before!==null&&d.before?.id!==d.id)||(d.after!==null&&d.after?.id!==d.id))||new Set(e.frames.map(d=>d.id)).size!==e.frames.length)throw Error('큐 수정 이력 오류');
   for(const k of ['performance','titles','order'])if(e[k]!==undefined&&(!e[k]||!own(e[k],'before')||!own(e[k],'after')))throw Error('수정 이력 값 오류');
   changes.add(i);
  }else if(!changes.has(e.target))throw Error('복원 이력 연결 오류');
 });
 const refs=[...h.undo,...h.redo];if(new Set(refs).size!==refs.length||refs.some(i=>!changes.has(i)))throw Error('실행 취소 이력 오류');
 // Reconstruct the stack to reject malformed references and ensure audit consistency.
 const undo=[],redo=[];
 h.entries.forEach((e,i)=>{if(e.type==='change'){undo.push(i);redo.length=0}else if(e.type==='undo'){if(undo.pop()!==e.target)throw Error('실행 취소 순서 오류');redo.push(e.target)}else{if(redo.pop()!==e.target)throw Error('다시 실행 순서 오류');undo.push(e.target)}});
 if(!same(undo,h.undo)||!same(redo,h.redo))throw Error('수정 이력 상태 오류');
 return h;
}
export const generation=d=>Number.isSafeInteger(d?.operatorEditCount)&&d.operatorEditCount>=0?d.operatorEditCount:0;
function finish(deck,h,g){const result={...deck,showHistory:h,operatorEditCount:g};readHistory(result);readPerformance(result);return validatePackage(result)}
export function recordShowChange(before,after,label,at=new Date().toISOString()){
 const h=structuredClone(readHistory(before));const b=new Map(before.frames.map(f=>[f.id,f])),a=new Map(after.frames.map(f=>[f.id,f]));
 const frames=[...new Set([...b.keys(),...a.keys()])].flatMap(id=>same(b.get(id),a.get(id))?[]:[{id,before:b.get(id)??null,after:a.get(id)??null}]);
 const e={type:'change',at,label,frames};
 for(const [k,old,value] of [['performance',before.performanceSettings??null,after.performanceSettings??null],['titles',before.numberTitles??null,after.numberTitles??null],['order',before.frames.map(f=>f.id),after.frames.map(f=>f.id)]])if(!same(old,value))e[k]={before:old,after:value};
 if(!frames.length&&!e.performance&&!e.titles&&!e.order)return before;
 h.undo.push(h.entries.length);h.redo=[];h.entries.push(structuredClone(e));
 return finish(after,h,generation(before)+1);
}
export function restoreShowChange(deck,direction,at=new Date().toISOString()){
 if(!['undo','redo'].includes(direction))throw Error('복원 명령 오류');
 const h=structuredClone(readHistory(deck)),from=h[direction],target=from.pop();if(target===undefined)throw Error('복원할 수정 내역이 없습니다.');
 const e=h.entries[target],side=direction==='undo'?'before':'after',opposite=direction==='undo'?'after':'before';
 const next=structuredClone(deck),map=new Map(next.frames.map(f=>[f.id,f]));
 for(const d of e.frames){if(!same(map.get(d.id)??null,d[opposite]))throw Error('현재 큐가 수정 이력과 일치하지 않습니다.');if(d[side]===null)map.delete(d.id);else map.set(d.id,d[side])}
 const order=e.order?.[side]??next.frames.map(f=>f.id);
 if(order.length!==map.size||new Set(order).size!==order.length||order.some(id=>!map.has(id)))throw Error('복원 큐 순서 오류');
 next.frames=order.map(id=>map.get(id));
 for(const [k,key] of [['performance','performanceSettings'],['titles','numberTitles']]){
  if(!e[k])continue;if(!same(next[key]??null,e[k][opposite]))throw Error('현재 설정이 수정 이력과 일치하지 않습니다.');
  if(e[k][side]===null)delete next[key];else next[key]=e[k][side];
 }
 h[direction==='undo'?'redo':'undo'].push(target);h.entries.push({type:direction,at,label:(direction==='undo'?'실행 취소 · ':'다시 실행 · ')+e.label,target});
 return finish(next,h,generation(deck)+1);
}
