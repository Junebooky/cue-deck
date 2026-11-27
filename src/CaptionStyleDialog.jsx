import React,{useEffect,useMemo,useState} from 'react';
import OperatorCaption from './OperatorCaption.jsx';
import {CAPTION_FONTS} from './caption-fonts.mjs';
import {PRESETS,effectiveStyle} from './caption-style.mjs';
import {estimateSolo} from './caption-measure.js';
import {ensureStyledFont} from './local-fonts.js';
import {cueWidths} from './caption-widths.mjs';
const num=i=>String(i+1).padStart(3,'0');
const baseOverride=s=>({relative:100,lineHeight:s.lineHeight,tracking:s.tracking,policy:s.policy});
export default function CaptionStyleDialog({deck,settings,widths,initialIndex,reviewMode,sample,busy,outputOpen,currentIndex,error,onApply,onClose}){
 const solos=useMemo(()=>deck.frames.map((f,i)=>({f,i})).filter(x=>x.f.kind==='solo'),[deck]);
 const [index,setIndex]=useState(initialIndex??solos[0]?.i??null),[filter,setFilter]=useState('all'),[example,setExample]=useState('current'),[draft,setDraft]=useState(()=>reviewMode?(settings.overrides[deck.frames[initialIndex??solos[0]?.i]?.id]??baseOverride(settings.style)):settings.style),[reset,setReset]=useState(false),[loaded,setLoaded]=useState(false),[fontError,setFontError]=useState('');
 const frame=deck.frames[index],original=reviewMode?(settings.overrides[frame?.id]??null):settings.style;
 const selected=reviewMode?(reset?null:draft):draft;
 const style=reviewMode?{...settings.style,relative:100,...(selected??baseOverride(settings.style))}:{...draft,relative:100};
 const view=reviewMode?frame:(example==='duet'?deck.frames.find(f=>f.kind==='overlap'):example==='long'?solos.reduce((best,x)=>!best||x.f.columns[0].lines.join('').length>best.columns[0].lines.join('').length?x.f:best,null):example==='solo'?solos.find(x=>x.f.columns[0].lines.join('\n').includes('\n'))?.f:sample)??solos[0]?.f??{kind:'black',columns:[]};
 const dirty=reviewMode?(reset?original!==null:JSON.stringify(draft)!==JSON.stringify(original??baseOverride(settings.style))):JSON.stringify(draft)!==JSON.stringify(original);
 const blocked=busy||!loaded||!!fontError||(reviewMode&&(!frame||outputOpen&&index===currentIndex));
 useEffect(()=>{let alive=true;setLoaded(false);setFontError('');ensureStyledFont(style.font,style.weight,...(reviewMode&&!outputOpen?solos.map(x=>x.f):[view].filter(Boolean))).then(()=>{if(alive)setLoaded(true)}).catch(e=>{if(alive)setFontError(e.message)});return()=>{alive=false}},[style.font,style.weight,reviewMode,outputOpen,solos,view]);
 const reports=useMemo(()=>reviewMode&&loaded&&!outputOpen?solos.map(({f,i})=>({f,i,...estimateSolo(f,effectiveStyle(settings,f))})):[],[reviewMode,loaded,outputOpen,solos,settings]);
 const rows=reports.filter(r=>filter==='all'||(filter==='long'?r.lines>=3:filter==='shrink'?r.shrink:filter==='risk'?r.risk:Object.hasOwn(settings.overrides,r.f.id)));
 const change=(k,v)=>{setReset(false);setDraft(old=>({...old,[k]:v}))};
 const choose=i=>{setIndex(i);setReset(false);setDraft(settings.overrides[deck.frames[i].id]??baseOverride(settings.style))};
 const range=(label,k,min,max,step,format)=><label className="style-range"><span>{label}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={style[k]} disabled={busy} onChange={e=>change(k,Number(e.target.value))}/><b>{format(style[k])}</b></label>;
 const apply=async()=>{if(blocked||!dirty)return;const result=await onApply(reviewMode?index:null,selected);if(result){if(reviewMode){setReset(false);setDraft(result.captionSettings.overrides[frame.id]??baseOverride(result.captionSettings.style))}else onClose()}};
 return <div className="caption-style-dialog">
 <p>{reviewMode?'기존 가사와 줄바꿈은 보존합니다. 큐별 보정은 다음 송출부터 반영됩니다.':'공연 전체 기본 스타일입니다. 미리보기만 변경되고 스타일 적용 후 실제 송출에 반영됩니다.'}</p>
 {reviewMode&&!outputOpen&&<><div className="width-review-summary">전체 일반 가사 {solos.length}개 · 3줄 이상 예상 {loaded?reports.filter(r=>r.lines>=3).length:'—'} · 축소 예상 {loaded?reports.filter(r=>r.shrink).length:'—'}</div><label>검수 필터 <select aria-label="장문 가사 검수 필터" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체</option><option value="long">3줄 이상 예상</option><option value="shrink">자동 축소 예상</option><option value="risk">가독성 확인 필요</option><option value="manual">수동 보정</option></select></label><div className="width-review-list">{rows.map(r=><button key={r.i} disabled={busy||dirty} aria-pressed={index===r.i} onClick={()=>choose(r.i)}>{num(r.i)} · {r.lines}줄 · {r.f.trigger}</button>)}</div><small>목록은 로컬 글자 폭으로 계산한 예상값입니다. 실제 줄 수는 아래 16:9 미리보기에서 확인하세요.</small></>}
 {!reviewMode&&<><div className="style-presets">{Object.entries(PRESETS).map(([k,p],i)=><button key={k} disabled={busy} onClick={()=>setDraft({...p})}>{['기본형','가독성','클래식'][i]}</button>)}</div><label>예시 <select aria-label="자막 예시" value={example} onChange={e=>setExample(e.target.value)}><option value="current">현재 큐</option><option value="solo">두 줄 가사</option><option value="duet">동시 가창</option><option value="long">장문 가사</option></select></label></>}
 {view&&<div className="width-preview"><OperatorCaption view={view} variant="preview" scale={style.scale} font={style.font} typography={style} exact ratios={cueWidths(widths,view)}/></div>}
 {reviewMode?<><b>CUE {index==null?'—':num(index)} · {selected&&dirty?'보정 미리보기':original?'수동 보정':'전역값'}</b>{range('큐별 글자 크기','relative',85,100,1,v=>v+'%')}<button disabled={busy} onClick={()=>{setDraft(baseOverride(settings.style));setReset(true)}}>전역값 복원</button></>:<>
 <label>폰트 <select aria-label="관객 자막 폰트" value={style.font} onChange={e=>change('font',e.target.value)}>{CAPTION_FONTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
 {range('관객 자막 크기','scale',90,120,5,v=>v+'%')}<div className="style-presets">{[500,600,700].map((w,i)=><button key={w} aria-pressed={style.weight===w} disabled={busy} onClick={()=>change('weight',w)}>{['Medium','SemiBold','Bold'][i]} · {w}</button>)}</div>{range('수직 위치','yOffset',-15,15,1,v=>v+'%')}</>}
 {range('줄 간격','lineHeight',1.2,1.9,.05,v=>v.toFixed(2))}{range('자간','tracking',-.025,.075,.005,v=>v.toFixed(3)+'em')}
 <label>장문 정책 <select aria-label="장문 정책" value={style.policy} onChange={e=>change('policy',e.target.value)}><option value="prefer-two">2줄 우선</option><option value="readable">가독성 우선</option></select></label>
 {fontError&&<p role="alert">{fontError}</p>}{error&&<p role="alert">{error}</p>}
 <div className="review-actions"><button disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={blocked||!dirty} onClick={apply}>{reviewMode?'큐 스타일 저장':'스타일 적용'}</button></div>
 </div>
}
