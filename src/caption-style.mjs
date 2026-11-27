import {validScale,readScale} from './caption-scale.mjs';
import {validFont,readFont} from './caption-fonts.mjs';
export const DEFAULT_STYLE=Object.freeze({font:'pretendard',scale:100,weight:600,lineHeight:1.5,tracking:0,yOffset:0,policy:'prefer-two'});
export const PRESETS={standard:DEFAULT_STYLE,readable:{...DEFAULT_STYLE,font:'noto-sans',scale:110,weight:700,lineHeight:1.65},classic:{...DEFAULT_STYLE,font:'noto-serif',scale:105,weight:500,lineHeight:1.65}};
const bounded=(v,min,max,step)=>typeof v==='number'&&Number.isFinite(v)&&v>=min-1e-9&&v<=max+1e-9&&Math.abs(v/step-Math.round(v/step))<1e-7;
const policy=v=>['prefer-two','readable'].includes(v);
export function validStyle(s){return !!s&&validFont(s.font)&&validScale(s.scale)&&[500,600,700].includes(s.weight)&&bounded(s.lineHeight,1.2,1.9,.05)&&bounded(s.tracking,-.025,.075,.005)&&bounded(s.yOffset,-15,15,1)&&policy(s.policy)}
export function validOverride(v){return !!v&&bounded(v.relative,85,100,1)&&bounded(v.lineHeight,1.2,1.9,.05)&&bounded(v.tracking,-.025,.075,.005)&&policy(v.policy)}
export function readSettings(value,font='pretendard',scale=100){
 if(value==null)return {style:{...DEFAULT_STYLE,font:readFont(font),scale:readScale(scale)},overrides:{}};
 if(!validStyle(value.style)||!value.overrides||typeof value.overrides!=='object'||Array.isArray(value.overrides)||Object.values(value.overrides).some(v=>!validOverride(v)))throw Error('자막 스타일 설정이 올바르지 않습니다.');
 return {style:{...value.style},overrides:{...value.overrides}};
}
export function effectiveStyle(settings,frame){const s=settings.style;const v=frame&&frame.kind==='solo'&&Object.hasOwn(settings.overrides,frame.id)?settings.overrides[frame.id]:null;return {...s,relative:100,...(validOverride(v)?v:{})}}
export function editSettings(settings,deck,index,value,outputOpen,currentIndex){
 if(index===null){if(!validStyle(value))throw Error('자막 스타일 범위를 확인하세요.');return {style:{...value},overrides:{...settings.overrides}}}
 if(!Number.isInteger(index)||deck.frames[index]?.kind!=='solo'||(outputOpen&&currentIndex===index)||(value!==null&&!validOverride(value)))throw Error('현재 송출 큐 또는 잘못된 보정값은 변경할 수 없습니다.');
 const overrides={...settings.overrides};const id=deck.frames[index].id;
 if(value===null)delete overrides[id];else Object.defineProperty(overrides,id,{value:{...value},enumerable:true,writable:true,configurable:true});
 return {...settings,overrides};
}
export function styleForRender(font,scale,typography){return {...DEFAULT_STYLE,font:readFont(font),scale:readScale(scale),relative:100,...typography}}
export function authoredLines(view){return view.columns[0]?.lines.flatMap(s=>s.split(/\r?\n/)).length??0}
