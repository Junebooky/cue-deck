import React,{useEffect,useMemo,useState} from 'react';
import {presentCaption} from './caption-presentation.mjs';
import OperatorCaption from './OperatorCaption.jsx';
import {cueWidths,equalWidths,moveBoundary,limits} from './caption-widths.mjs';
import {measureLayout} from './caption-measure.js';
import {ensureStyledFont} from './local-fonts.js';
const num=i=>String(i+1).padStart(3,'0');
export default function CaptionWidthsDialog({deck,initialIndex,overrides,scale,font,typography,busy,outputOpen,currentIndex,onApply,error}){
 const all=useMemo(()=>deck.frames.map((f,i)=>({f,i})).filter(({f})=>f.kind==='overlap'),[deck]);
 const [index,setIndex]=useState(initialIndex??all[0]?.i??null),[filter,setFilter]=useState('all'),[draft,setDraft]=useState(null),[loaded,setLoaded]=useState(false),[fontError,setFontError]=useState('');
 const frame=deck.frames[index],manual=cueWidths(overrides,frame);
 const [draftSet,setDraftSet]=useState(false);
 const singleActive=frame?.kind==='overlap'&&presentCaption(frame).kind==='solo';
 const selected=draftSet?draft:manual;
 useEffect(()=>{let alive=true;setLoaded(false);setFontError('');ensureStyledFont(font,typography?.weight??600,...(outputOpen?[frame].filter(Boolean):all.map(x=>x.f))).then(()=>{if(alive)setLoaded(true)}).catch(e=>{if(alive)setFontError(e.message)});return()=>{alive=false}},[all,font,outputOpen,index,typography?.weight]);
 const reports=useMemo(()=>all.map(({f,i})=>({f,i,...measureLayout(f,font,scale,cueWidths(overrides,f),typography)})),[all,font,scale,overrides,loaded,JSON.stringify(typography)]);
 const rows=reports.filter(r=>filter==='all'||(filter==='risk'?r.risk:filter==='shrink'?r.shrink:!!cueWidths(overrides,r.f)));
 const auto=frame?measureLayout(frame,font,scale,null,typography).ratios:[];
 const ratios=singleActive?auto:selected??auto;
 const blocked=busy||!loaded||!frame||singleActive||frame.kind!=='overlap'||(outputOpen&&index===currentIndex);
 const choose=i=>{setIndex(i);setDraft(null);setDraftSet(false)};
 const change=value=>{setDraft(value);setDraftSet(true)};
 const dirty=JSON.stringify(selected)!==JSON.stringify(manual);
 const save=async()=>{if(blocked||!dirty)return;const result=await onApply(index,selected);if(result){setDraftSet(false);setDraft(null)}};
 return <div className="caption-widths-dialog">
 <p>동시 가창을 검수합니다. 한 명만 가사가 있는 큐는 일반 자막 너비를 자동 적용합니다. 수동 조절은 현재 큐에만 저장되며 실제 송출은 GO 시 반영됩니다.</p>
 {fontError&&<p role="alert">{fontError}</p>}{error&&<p role="alert">{error}</p>}
 {!outputOpen&&<><div className="width-review-summary">전체 {all.length}개 · 축소 예상 {loaded?reports.filter(r=>r.shrink).length:'—'}개 · 줄바꿈 검수 {loaded?reports.filter(r=>r.risk).length:'—'}개</div><label>검수 필터 <select aria-label="동시 가창 검수 필터" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체</option><option value="risk">줄바꿈 예상</option><option value="shrink">크기 축소 예상</option><option value="manual">수동 설정</option></select></label><div className="width-review-list">{rows.map(r=><button key={r.i} disabled={busy||dirty} aria-pressed={r.i===index} onClick={()=>choose(r.i)}>{num(r.i)} · {r.f.columns.map(c=>c.actor).join(' / ')} · {r.ratios.join(':')}{loaded&&r.risk?' · 검수 필요':''}</button>)}</div><small>예상 목록은 16:9 기준 실제 폰트 폭을 측정합니다. 선택한 큐의 미리보기와 실물 화면에서 최종 확인하세요.</small></>}
 {frame?.kind==='overlap'&&<><div className="width-editor-title"><b>CUE {num(index)}</b><span>{singleActive?'일반 자막 자동 적용':selected?'MANUAL':'AUTO'} · {ratios.join(':')}</span>{!singleActive&&<button disabled={blocked} onClick={()=>change(null)}>AUTO 복원</button>}</div><div className="width-preview"><OperatorCaption view={frame} variant="preview" scale={scale} font={font} typography={typography} exact ratios={selected} onRatios={blocked?null:change}/></div>
 {singleActive?<p className="caption-fit-note">가사 있는 배우만 전체 너비로 표시합니다. 원본 동시 가창 정보와 저장된 열 설정은 유지됩니다.</p>:<><div className="width-actors">{frame.columns.map((c,i)=><span key={i}>{c.actor} · {ratios[i]}%</span>)}</div>
 {ratios.slice(0,-1).map((_,i)=>{const [min,max]=limits(ratios.length),before=ratios.slice(0,i).reduce((a,b)=>a+b,0),total=ratios[i]+ratios[i+1];return <label key={i}>경계 {i+1}<input type="range" aria-label={'열 경계 '+(i+1)} min={before+Math.max(min,total-max)} max={before+Math.min(max,total-min)} step={1} value={before+ratios[i]} disabled={blocked} onChange={e=>change(moveBoundary(ratios,i,Number(e.target.value)))}/></label>})}
 <div className="width-presets">{(ratios.length===2?[30,40,50,60,70].map(x=>[x,100-x]):[equalWidths(3)]).map(v=><button key={v.join(':')} disabled={blocked} onClick={()=>change(v)}>{v.join(':')}</button>)}</div>
 <div className="review-actions"><button disabled={busy||!dirty} onClick={()=>{setDraft(null);setDraftSet(false)}}>변경 취소</button><button className="primary" disabled={blocked||!dirty} onClick={save}>큐 너비 저장</button></div></>}</>}
 {!all.length&&<p>동시 가창 큐가 없습니다.</p>}
 </div>
}
