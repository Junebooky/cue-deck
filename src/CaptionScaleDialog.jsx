import React,{useState} from 'react';
import OperatorCaption from './OperatorCaption.jsx';
import {MIN_SCALE,MAX_SCALE,DEFAULT_SCALE,SCALE_STEP} from './caption-scale.mjs';
export default function CaptionScaleDialog({current,view,busy,live,onApply,onCancel,error}){
 const [draft,setDraft]=useState(current);
 return <div className="caption-scale-dialog">
  <p>관객 화면 전체 자막에 적용합니다. 글자 크기만 바뀌며 현재 큐와 검정 화면 상태는 유지됩니다.</p>
  <div className="scale-readout"><span>송출 크기</span><strong>{draft}%</strong><button disabled={busy} onClick={()=>setDraft(DEFAULT_SCALE)}>기본값</button></div>
  <div className="scale-slider"><button aria-label="자막 크기 줄이기" disabled={busy||draft<=MIN_SCALE} onClick={()=>setDraft(v=>Math.max(MIN_SCALE,v-SCALE_STEP))}>−</button><input type="range" aria-label="관객 자막 크기" min={MIN_SCALE} max={MAX_SCALE} step={SCALE_STEP} value={draft} disabled={busy} onChange={e=>setDraft(Number(e.target.value))}/><button aria-label="자막 크기 늘리기" disabled={busy||draft>=MAX_SCALE} onClick={()=>setDraft(v=>Math.min(MAX_SCALE,v+SCALE_STEP))}>+</button></div>
  <div className="scale-ticks"><span>90% 최소</span><span>100% 기본</span><span>120% 최대</span></div>
  <div className="scale-sample"><div className="muted text-xs">관객 화면 비례 미리보기 · 송출되지 않음</div><OperatorCaption view={view} variant="preview" scale={draft} exact/></div>
  <p>긴 가사와 동시 가창은 안전 영역에 맞춰 동일한 크기로 자동 조절됩니다. 지나치게 긴 문장은 최소 설정보다 작아질 수 있으므로 경고가 표시되면 리허설에서 확인하세요.</p>
  {live&&<p className="scale-live-note">적용을 누르면 현재 관객 화면에도 반영됩니다.</p>}
  {error&&<div role="status" className="import-error">{error}</div>}
  <div className="review-actions"><button disabled={busy} onClick={onCancel}>취소</button><button className="primary" disabled={busy||draft===current} onClick={()=>onApply(draft)}>자막 크기 적용</button></div>
 </div>
}
