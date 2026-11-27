import React,{useMemo,useState} from 'react';
import OperatorCaption from './OperatorCaption.jsx';
import {buildNumbers,searchNumbers} from './number-search.mjs';
import {effectiveStyle} from './caption-style.mjs';
import {cueWidths} from './caption-widths.mjs';
const num=i=>String(i+1).padStart(3,'0');
export default function NumberSearch({deck,settings,widths,busy,disabled,onPreview,onSend,error}){
 const [query,setQuery]=useState(''),[chosen,setChosen]=useState(null);
 const numbers=useMemo(()=>buildNumbers(deck),[deck]);
 const rows=searchNumbers(numbers,query),song=rows.find(n=>n.key===chosen)??null;
 const frame=song?.first==null?null:deck.frames[song.first],style=effectiveStyle(settings,frame);
 return <div className="number-search">
 <p>곡 제목이나 M번호로 검색하세요. 곡의 첫 가사 큐를 선택하며, 장소와 드라마는 건너뜁니다. 검색 및 선택만으로는 관객 화면이 바뀌지 않습니다.</p>
 <input autoFocus type="search" aria-label="넘버 제목 또는 번호 검색" placeholder="예: M05-2, 사랑과 복수, 리프라이즈" value={query} onChange={e=>{setQuery(e.target.value);setChosen(null)}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.currentTarget.blur()}if(e.key==='Enter'){e.preventDefault();const first=rows.find(n=>n.first!==null);if(first)setChosen(first.key)}}}/>
 <div className="muted">검색 결과 {rows.length}개 · 전체 {numbers.length}개</div>
 <div className="number-results">{rows.map(n=><button key={n.key} disabled={busy||n.first===null} aria-pressed={song?.key===n.key} onClick={()=>setChosen(n.key)}><b>{n.label}</b><small>ACT {n.act} · {n.scene}</small><span>{n.first===null?'송출 가사 없음 · 이동 불가':'CUE '+num(n.first)+' 시작 · 가사 큐 '+n.count+'개'}</span></button>)}</div>
 {!rows.length&&<p>일치하는 넘버가 없습니다.</p>}
 {frame&&<><div className="width-editor-title"><b>{song.label}</b><span>CUE {num(song.first)} · 첫 가사</span></div><div className="width-preview"><OperatorCaption view={frame} variant="preview" exact scale={style.scale} font={style.font} typography={style} ratios={cueWidths(widths,frame)}/></div><p>직접 송출하면 이 큐로 이동합니다. 이후 진행은 기존 대본 순서를 따릅니다.</p><div className="review-actions"><button disabled={busy} onClick={()=>onPreview(song.first)}>PREVIEW로 이동</button><button className="primary" disabled={disabled} onClick={()=>onSend(song.first)}>CUE {num(song.first)} 직접 송출</button></div></>}
 {error&&<p role="alert">{error}</p>}
 </div>
}
