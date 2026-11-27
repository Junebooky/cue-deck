import {useLayoutEffect,useState} from 'react';
import {captionTarget,fitCaption,readScale,MIN_SCALE} from './caption-scale.mjs';
export function useCaptionFit(rootRef,bodyRef,view,scale,monitor=false){
 const [result,setResult]=useState({reduced:false,tooSmall:false,overflow:false});
 useLayoutEffect(()=>{
  const root=rootRef.current,body=bodyRef.current;
  if(!root||!body)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||!root.clientWidth||!root.clientHeight)return;
   if(!view.columns.length){setResult(old=>old.reduced||old.tooSmall||old.overflow?{reduced:false,tooSmall:false,overflow:false}:old);return}
   const w=root.clientWidth,h=root.clientHeight,n=view.columns.length;
   const target=captionTarget(w,h,n,scale,monitor);
   const measure=px=>{
    body.style.setProperty('--caption-size',px+'px');
    return body.getBoundingClientRect().height<=h*.86+1&&body.scrollWidth<=body.clientWidth+1&&[...body.children].every(cell=>cell.scrollWidth<=cell.clientWidth+1);
   };
   const actual=fitCaption(target,measure);body.style.setProperty('--caption-size',actual.size+'px');
   const floor=captionTarget(w,h,n,MIN_SCALE,monitor);
   const next={reduced:actual.size<target-1,tooSmall:actual.size<floor-1,overflow:!actual.fits};
   setResult(old=>Object.keys(next).every(k=>old[k]===next[k])?old:next);
  };
  const ro=new ResizeObserver(fit);ro.observe(root);fit();document.fonts?.ready.then(fit).catch(()=>{});
  return()=>{disposed=true;ro.disconnect()};
 },[rootRef,bodyRef,view,scale,monitor]);
 return result;
}
