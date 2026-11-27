import React,{useLayoutEffect,useRef} from 'react';
import {fitMonitorFont,monitorFontBounds} from './monitor-fit.mjs';

// Operator-only readable rendering. The audience's geometry and fit are untouched.
export default function OperatorCaption({view,variant='preview'}){
 const ref=useRef(null),content=useRef(null);
 const n=view.columns.length,rows=view.columns[0]?.lines.length||0;
 useLayoutEffect(()=>{
  const root=ref.current,body=content.current;
  if(!root||!body||!n)return;
  let disposed=false;
  const fit=()=>{
   if(disposed||!root.clientWidth||!root.clientHeight)return;
   const bounds=monitorFontBounds(root.clientWidth,root.clientHeight,n,variant);
   const availableHeight=root.clientHeight*.86;
   const measure=px=>{
    body.style.setProperty('--caption-size',px+'px');
    // Compare actual cells with their own available space, not rounded 92% of the parent.
    return body.getBoundingClientRect().height<=availableHeight+1 &&
      body.scrollWidth<=body.clientWidth+1 &&
      [...body.children].every(cell=>cell.scrollWidth<=cell.clientWidth+1);
   };
   const px=fitMonitorFont(bounds,measure);
   body.style.setProperty('--caption-size',px+'px');
  };
  const ro=new ResizeObserver(fit);ro.observe(root);fit();
  document.fonts?.ready.then(fit).catch(()=>{});
  return()=>{disposed=true;ro.disconnect()};
 },[view,n,variant]);
 return <div ref={ref} className={'caption monitor-caption operator-caption '+variant+'-frame'} data-kind={view.kind}>
  <div ref={content} className="caption-grid" style={{gridTemplateColumns:'repeat('+Math.max(n,1)+', minmax(0,1fr))'}}>
   {n>1&&view.columns.map((c,i)=><div key={'h'+i} className="caption-actor">{c.actor}</div>)}
   {Array.from({length:rows},(_,r)=>view.columns.map((c,i)=><div className="caption-cell" key={r+':'+i}>{c.lines[r]||'\u00a0'}</div>))}
  </div>
 </div>
}
