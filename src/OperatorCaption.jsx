import React,{useRef} from 'react';
import {DEFAULT_SCALE} from './caption-scale.mjs';
import {useCaptionFit} from './useCaptionFit.js';
export default function OperatorCaption({view,variant='preview',scale=DEFAULT_SCALE,exact=false}){
 const ref=useRef(null),content=useRef(null);
 const n=view.columns.length,rows=view.columns[0]?.lines.length||0;
 const fit=useCaptionFit(ref,content,view,scale,!exact);
 return <div className="operator-caption-wrap"><div ref={ref} className={'caption monitor-caption operator-caption '+variant+'-frame'} data-kind={view.kind} data-scale={scale}>
  <div ref={content} className="caption-grid" style={{gridTemplateColumns:'repeat('+Math.max(n,1)+', minmax(0,1fr))'}}>
   {n>1&&view.columns.map((c,i)=><div key={'h'+i} className="caption-actor">{c.actor}</div>)}
   {Array.from({length:rows},(_,r)=>view.columns.map((c,i)=><div className="caption-cell" key={r+':'+i}>{c.lines[r]||'\u00a0'}</div>))}
  </div>
 </div>{fit.overflow||fit.tooSmall?<div className="caption-fit-warning" role="status">가독성 확인 필요 · 긴 자막 자동 축소</div>:fit.reduced?<div className="caption-fit-note">안전 영역에 맞춰 자동 축소</div>:null}</div>
}
