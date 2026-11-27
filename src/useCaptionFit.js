import {useLayoutEffect,useState} from 'react';
import {captionTarget,fitCaption,MIN_SCALE} from './caption-scale.mjs';
import {measureLayout} from './caption-measure.js';
import {gridWidths} from './caption-widths.mjs';
import {ensureStyledFont} from './local-fonts.js';
import {styleForRender,authoredLines} from './caption-style.mjs';
export function useCaptionFit(rootRef,bodyRef,view,scale,monitor=false,font,manual=null,typography){
 const [result,setResult]=useState({reduced:false,tooSmall:false,overflow:false,wrapped:false,ratios:[100],lines:0});
 const manualKey=manual?.join(',')??'auto',style=styleForRender(font,scale,typography),styleKey=JSON.stringify(style);
 useLayoutEffect(()=>{
  const root=rootRef.current,body=bodyRef.current;if(!root||!body)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||!root.clientWidth||!root.clientHeight)return;
   const n=view.columns.length,w=root.clientWidth,h=root.clientHeight;
   const {ratios}=measureLayout(view,style.font,style.scale,manual,style);
   body.style.gridTemplateColumns=gridWidths(ratios);
   body.style.fontWeight=String(style.weight);body.style.lineHeight=String(style.lineHeight);body.style.letterSpacing=style.tracking+'em';
   body.style.rowGap='0em';body.style.transform='translateY('+h*style.yOffset/100+'px)';
   const update=next=>setResult(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
   if(!n){delete body.dataset.nowrap;update({reduced:false,tooSmall:false,overflow:false,wrapped:false,ratios,lines:0});return}
   const base=captionTarget(w,h,n,style.scale,monitor),target=base*style.relative/100;
   const floor=n>1?Math.min(target,captionTarget(w,h,n,MIN_SCALE,monitor)):Math.min(target,base*.85);
   const count=()=>[...body.querySelectorAll('.caption-cell')].reduce((sum,cell)=>{const lh=parseFloat(getComputedStyle(cell).lineHeight);return sum+Math.max(1,Math.round(cell.getBoundingClientRect().height/lh))},0);
   const measure=px=>{
    body.style.setProperty('--caption-size',px+'px');
    return body.getBoundingClientRect().height<=h*(.86-2*Math.abs(style.yOffset)/100)+1&&body.scrollWidth<=body.clientWidth+1&&[...body.children].every(cell=>cell.scrollWidth<=cell.clientWidth+1);
   };
   let wrapped=false;
   if(n>1)body.dataset.nowrap='true';else delete body.dataset.nowrap;
   let actual=fitCaption(target,measure);
   if(n>1&&(!actual.fits||actual.size<floor-1)){delete body.dataset.nowrap;wrapped=true;actual=fitCaption(target,measure)}
   if(n===1&&view.kind==='solo'&&style.policy==='prefer-two'&&authoredLines(view)<=2){
    body.style.setProperty('--caption-size',actual.size+'px');
    if(count()>2){const two=fitCaption(target,px=>measure(px)&&count()<=2);if(two.fits&&two.size>=floor-.5)actual=two}
   }
   body.style.setProperty('--caption-size',actual.size+'px');
   const lines=count();if(n===1)wrapped=lines>authoredLines(view);
   update({reduced:actual.size<target-1,tooSmall:actual.size<floor-1,overflow:!actual.fits,wrapped,ratios,lines});
  };
  const ro=new ResizeObserver(fit);ro.observe(root);fit();
  if(view.columns.length)ensureStyledFont(style.font,style.weight,view).then(fit).catch(()=>{});
  document.fonts?.ready.then(fit).catch(()=>{});
  return()=>{disposed=true;ro.disconnect()};
 },[rootRef,bodyRef,view,scale,monitor,font,manualKey,styleKey]);
 return result;
}
