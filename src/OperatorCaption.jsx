import React,{useRef} from 'react';
import {DEFAULT_SCALE} from './caption-scale.mjs';
import {useCaptionFit} from './useCaptionFit.js';
import {DEFAULT_FONT,captionFamily} from './caption-fonts.mjs';
import {moveBoundary} from './caption-widths.mjs';
export default function OperatorCaption({view,variant='preview',scale=DEFAULT_SCALE,exact=false,font=DEFAULT_FONT,ratios=null,onRatios=null}){
 const ref=useRef(null),content=useRef(null);
 const n=view.columns.length,rows=view.columns[0]?.lines.length||0;
 const fit=useCaptionFit(ref,content,view,scale,!exact,font,ratios);
 const drag=useRef(null);
 const boundary=(e,i)=>{const body=content.current?.getBoundingClientRect();if(!body||!body.width)return;onRatios?.(moveBoundary(drag.current?.ratios??fit.ratios,i,(e.clientX-body.left)/body.width*100))};
 return <div className="operator-caption-wrap"><div ref={ref} className={'caption monitor-caption operator-caption '+variant+'-frame'} data-kind={view.kind} data-scale={scale} data-font={font} data-ratios={fit.ratios.join(':')} data-wrap={fit.wrapped} style={{fontFamily:captionFamily(font)}}>
  <div ref={content} className="caption-grid" style={{gridTemplateColumns:'repeat('+Math.max(n,1)+', minmax(0,1fr))'}}>
   {n>1&&view.columns.map((c,i)=><div key={'h'+i} className="caption-actor">{c.actor}</div>)}
   {Array.from({length:rows},(_,r)=>view.columns.map((c,i)=><div className="caption-cell" key={r+':'+i}>{c.lines[r]||'\u00a0'}</div>))}
  </div>
 {onRatios&&n>1&&fit.ratios.length===n&&fit.ratios.slice(0,-1).map((_,i)=><button key={i} type="button" className="caption-boundary" aria-label={'열 경계 '+(i+1)+' 조절'} style={{left:(4+.92*fit.ratios.slice(0,i+1).reduce((a,b)=>a+b,0))+'%'}} onPointerDown={e=>{drag.current={ratios:fit.ratios};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault()}} onPointerMove={e=>{if(drag.current)boundary(e,i)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();onRatios(moveBoundary(fit.ratios,i,fit.ratios.slice(0,i+1).reduce((a,b)=>a+b,0)+(e.key==='ArrowLeft'?-1:1)))}}}/>)}
 </div>{fit.overflow||fit.tooSmall?<div className="caption-fit-warning" role="status">가독성 확인 필요 · 긴 자막 자동 축소</div>:fit.wrapped?<div className="caption-fit-note">가독성 유지 · 줄바꿈 허용</div>:fit.reduced?<div className="caption-fit-note">안전 영역에 맞춰 자동 축소</div>:null}</div>
}
