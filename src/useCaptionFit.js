import {useLayoutEffect,useState} from 'react';
import {captionTarget,fitCaption,MIN_SCALE} from './caption-scale.mjs';
import {measureLayout} from './caption-measure.js';
import {gridWidths} from './caption-widths.mjs';
import {ensureCaptionFont} from './local-fonts.js';
export function useCaptionFit(rootRef,bodyRef,view,scale,monitor=false,font,manual=null){
 const [result,setResult]=useState({reduced:false,tooSmall:false,overflow:false,wrapped:false,ratios:[100]});
 const manualKey=manual?.join(',')??'auto';
 useLayoutEffect(()=>{
  const root=rootRef.current,body=bodyRef.current;
  if(!root||!body)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||!root.clientWidth||!root.clientHeight)return;
   const n=view.columns.length;
   const {ratios}=measureLayout(view,font,scale,manual);
   body.style.gridTemplateColumns=gridWidths(ratios);
   const update=next=>setResult(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
   if(!n){delete body.dataset.nowrap;update({reduced:false,tooSmall:false,overflow:false,wrapped:false,ratios});return}
   const w=root.clientWidth,h=root.clientHeight,target=captionTarget(w,h,n,scale,monitor),floor=captionTarget(w,h,n,MIN_SCALE,monitor);
   const measure=px=>{
    body.style.setProperty('--caption-size',px+'px');
    return body.getBoundingClientRect().height<=h*.86+1&&body.scrollWidth<=body.clientWidth+1&&[...body.children].every(cell=>cell.scrollWidth<=cell.clientWidth+1);
   };
   let wrapped=false;
   if(n>1)body.dataset.nowrap='true';else delete body.dataset.nowrap;
   let actual=fitCaption(target,measure);
   // Prefer no extra wraps while still legible; otherwise preserve font size
   // using natural wrapping. Existing explicit newlines and row alignment stay.
   if(n>1&&(!actual.fits||actual.size<floor-1)){
    delete body.dataset.nowrap;wrapped=true;actual=fitCaption(target,measure);
   }
   body.style.setProperty('--caption-size',actual.size+'px');
   update({reduced:actual.size<target-1,tooSmall:actual.size<floor-1,overflow:!actual.fits,wrapped,ratios});
  };
  const ro=new ResizeObserver(fit);ro.observe(root);fit();
  if(view.columns.length)ensureCaptionFont(font,view).then(fit).catch(()=>{});
  document.fonts?.ready.then(fit).catch(()=>{});
  return()=>{disposed=true;ro.disconnect()};
 },[rootRef,bodyRef,view,scale,monitor,font,manualKey]);
 return result;
}
