// Column ratios are integer percentages, independent of display resolution.
export const limits=n=>n===2?[30,70]:n===3?[20,60]:[100,100];
export function equalWidths(n){return Array.from({length:n},(_,i)=>Math.floor(100/n)+(i<100%n?1:0))}
export function validWidths(value,n){const [min,max]=limits(n);return [2,3].includes(n)&&Array.isArray(value)&&value.length===n&&value.every(v=>Number.isInteger(v)&&v>=min&&v<=max)&&value.reduce((a,b)=>a+b,0)===100}
export function readWidths(value,n){return validWidths(value,n)?value:null}
export function gridWidths(ratios){return ratios.map(v=>'minmax(0,'+v+'fr)').join(' ')}
export function moveBoundary(ratios,i,position){
 if(!validWidths(ratios,ratios.length)||i<0||i>=ratios.length-1||!Number.isFinite(position))return ratios;
 const [min,max]=limits(ratios.length),before=ratios.slice(0,i).reduce((a,b)=>a+b,0),total=ratios[i]+ratios[i+1];
 const left=Math.max(min,total-max,Math.min(max,total-min,Math.round(position-before)));
 return ratios.map((v,j)=>j===i?left:j===i+1?total-left:v);
}
export function autoWidths(demand,available){
 const n=demand.length,eq=equalWidths(n);
 if(n<2||n>3||!Number.isFinite(available)||available<=0)return eq;
 const score=r=>Math.max(...r.map((v,i)=>Math.max(0,demand[i])/(available*v/100)));
 if(score(eq)<=1)return eq;
 const [min,max]=limits(n),candidates=[eq];
 for(let a=min;a<=max;a+=5){if(n===2){if(validWidths([a,100-a],n))candidates.push([a,100-a])}else for(let b=min;b<=max;b+=5){const v=[a,b,100-a-b];if(validWidths(v,n))candidates.push(v)}}
 const imbalance=r=>r.reduce((s,v)=>s+(v-100/n)**2,0);
 return candidates.sort((a,b)=>Math.max(1,score(a))-Math.max(1,score(b))||imbalance(a)-imbalance(b))[0];
}
export function cueWidths(overrides,frame){return frame?.kind==='overlap'&&Object.hasOwn(overrides??{},frame.id)?readWidths(overrides[frame.id],frame.columns.length):null}
export function updateWidths(overrides,frame,value){
 if(frame?.kind!=='overlap'||(value!==null&&!validWidths(value,frame.columns.length)))throw Error('동시 가창 열 비율이 올바르지 않습니다.');
 const next={...overrides};if(value===null)delete next[frame.id];else Object.defineProperty(next,frame.id,{value:[...value],enumerable:true,writable:true,configurable:true});return next;
}
export function assertWidthEdit(deck,active,expected,index,value,outputOpen,currentIndex){
 if(active!==expected||!Number.isInteger(index)||index<0||index>=deck.frames.length)throw Error('대본 또는 큐가 변경되었습니다.');
 if(outputOpen&&index===currentIndex)throw Error('현재 송출 큐의 너비는 변경할 수 없습니다.');
 const frame=deck.frames[index];if(frame.kind!=='overlap'||(value!==null&&!validWidths(value,frame.columns.length)))throw Error('동시 가창 열 비율이 올바르지 않습니다.');
 return frame;
}
