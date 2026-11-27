import React,{useState} from 'react';
import {NOTE_LABELS,elapsed,repeatCount,exportNotes} from './rehearsal.mjs';
function download(text){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='cue-deck-rehearsal-notes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export default function RehearsalNotes({r,deck,active,onJump,onClose,canStart}){
 const [session,setSession]=useState(r.sessionId||'all'),[kind,setKind]=useState('all'),[actor,setActor]=useState('all'),[scene,setScene]=useState('all'),[status,setStatus]=useState('all'),[copyStatus,setCopyStatus]=useState('');
 const all=r.log.notes.filter(n=>n.productionId===deck.productionId);
 const sessions=r.log.sessions.filter(s=>s.productionId===deck.productionId);
 const actors=[...new Set(all.flatMap(n=>n.actors))],scenes=[...new Set(all.map(n=>n.scene))];
 const notes=all.filter(n=>(session==='all'||n.sessionId===session)&&(kind==='all'||n.kind===kind)&&(actor==='all'||n.actors.includes(actor))&&(scene==='all'||n.scene===scene)&&(status==='all'||(status==='done')===n.resolved));
 const count=notes.reduce((s,n)=>s+n.events.length,0);
 const filter=(label,value,set,items)=><label>{label}<select aria-label={label} value={value} onChange={e=>set(e.target.value)}><option value="all">전체</option>{items.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>;
 return <div className="rehearsal-notes">
 <p>현재 LIVE 또는 READ 위치에서 E를 누르면 자동 기록합니다. 실제 송출과 대본은 변경되지 않습니다.</p>
 <div className="rehearsal-actions">{r.enabled?<button onClick={()=>r.stop()}>리허설 종료</button>:<button className="primary" disabled={!canStart||!!r.error} onClick={()=>{if(r.start(deck,active))onClose()}}>새 리허설 시작</button>}<span>{r.enabled?'● REHEARSAL ON':'공연 모드 · E 비활성'}</span></div>
 {r.error&&<p role="alert" className="import-error">{r.error}</p>}
 <div className="review-summary"><div><b>기록 위치</b>{notes.length}건</div><div><b>발생 횟수</b>{count}회</div><div><b>미해결</b>{notes.filter(n=>!n.resolved).length}건</div></div>
 <div className="note-filters">{filter('회차',session,setSession,sessions.map(s=>[s.id,new Date(s.startedAt).toLocaleString('ko-KR')+' · '+s.revision]))}{filter('유형',kind,setKind,Object.entries(NOTE_LABELS))}{filter('배우',actor,setActor,actors.map(a=>[a,a]))}{filter('장면',scene,setScene,scenes.map(s=>[s,s]))}{filter('상태',status,setStatus,[['open','미해결'],['done','확인 완료']])}</div>
 <div className="rehearsal-actions"><button disabled={!notes.length} onClick={()=>download(exportNotes(notes,sessions))}>CSV 내보내기</button><button disabled={!notes.length} onClick={async()=>{try{await navigator.clipboard.writeText(notes.map(n=>[NOTE_LABELS[n.kind],n.scene,n.actors.join(' / '),n.original,n.actual,n.memo,n.resolved?'확인 완료':'미해결'].join(' | ')).join('\n'));setCopyStatus('복사 완료')}catch{setCopyStatus('복사 실패 · CSV를 이용하세요')}}}>텍스트 복사</button><span role="status">{copyStatus}</span></div>
 <div className="note-list">{notes.length?notes.map(n=><article className="note-item" key={n.id}>
 <div className="note-meta"><b>⚑ {NOTE_LABELS[n.kind]}</b><span>{n.scene} · {n.actors.join(' / ')} · {n.revision}</span><span>{n.events.length}회 · 동일 버전 누적 {repeatCount(r.log,n)}회</span></div>
 <div className="note-meta"><span>{n.cueNumber?'CUE '+String(n.cueNumber).padStart(3,'0'):'READ'} · {elapsed(n.events[0].elapsedMs)}</span><button disabled={n.active!==active||!deck.blocks.some(b=>b.id===n.blockId)} onClick={()=>onJump(n.blockId)}>원본 위치</button></div>
 <div className="note-original">{n.source.map(b=><div key={b.id}><small>{b.actor}</small>{b.cells?<div className="review-cells" style={{gridTemplateColumns:'repeat('+b.cells.length+', minmax(0,1fr))'}}>{b.cells.map((c,i)=><span key={i}>{c||'빈 칸'}</span>)}</div>:<div>{b.text}</div>}</div>)}</div>
 <label>오류 상세 (배우·줄 지정)<input key={n.id+'detail'} defaultValue={n.detail} onBlur={e=>r.edit(n.id,{detail:e.target.value})} placeholder="예: 두 번째 줄, 코러스"/></label>
 <label>실제 발화<textarea key={n.id+'actual'} defaultValue={n.actual} onBlur={e=>r.edit(n.id,{actual:e.target.value})} rows={2}/></label>
 <label>메모<textarea key={n.id+'memo'} defaultValue={n.memo} onBlur={e=>r.edit(n.id,{memo:e.target.value})} rows={2}/></label>
 <label className="review-check"><input type="checkbox" checked={n.resolved} onChange={e=>r.edit(n.id,{resolved:e.target.checked})}/> 확인 완료</label>
 </article>):<p>기록이 없습니다.</p>}</div><p>입력 내용은 입력칸을 벗어나면 저장됩니다. 다른 대본 버전의 기록은 당시 원문으로 보존되며 현재 대본으로 임의 이동하지 않습니다.</p></div>
}
