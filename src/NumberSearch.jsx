import React,{useMemo,useState} from 'react';
import {buildNumbers,searchNumbers} from './number-search.mjs';
const num=i=>String(i+1).padStart(3,'0');
export default function NumberSearch({deck,busy,onLocate,error}){
 const [query,setQuery]=useState('');
 const numbers=useMemo(()=>buildNumbers(deck),[deck]),rows=searchNumbers(numbers,query);
 return <div className="number-search">
 <p>넘버를 선택하면 첫 가사 카드로 바로 이동합니다. 카드 클릭 시 즉시 송출되며, 검색만으로는 관객 화면이 바뀌지 않습니다.</p>
 <input autoFocus type="search" aria-label="넘버 제목 또는 번호 검색" placeholder="넘버 제목 또는 M번호" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.currentTarget.blur()}if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();const first=rows.find(n=>n.first!==null);if(first&&!busy)onLocate(first.first)}}}/>
 <div className="muted">검색 결과 {rows.length}개 · 전체 {numbers.length}개</div>
 <div className="number-results">{rows.map(n=><button key={n.key} disabled={busy||n.first===null} onClick={()=>onLocate(n.first)}><b>{n.label}</b><small>ACT {n.act} · {n.scene}</small><span>{n.first===null?(n.catalogOnly?'목차에만 있음 · 송출 위치 미확정':'송출 가사 없음 · 이동 불가'):'CUE '+num(n.first)+' 위치로 이동 · 가사 큐 '+n.count+'개'}</span></button>)}</div>
 {!rows.length&&<p>일치하는 넘버가 없습니다.</p>}
 {error&&<p role="alert">{error}</p>}
 </div>
}
