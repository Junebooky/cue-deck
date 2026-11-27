import React,{useState,useRef,useLayoutEffect} from 'react';
import {NOTE_LABELS} from './rehearsal.mjs';

export default function QuickErrorMemo({note,onSave,onClose,error}){
 const [memo,setMemo]=useState('');
 const input=useRef(null),composing=useRef(false);
 useLayoutEffect(()=>{input.current?.focus()},[]);
 const save=()=>{if(!memo.trim()){onClose();return}if(onSave(note.id,memo))onClose()};
 return <form className="quick-error-memo" onSubmit={e=>{e.preventDefault();save()}} onKeyDown={e=>{
  if(composing.current||e.nativeEvent.isComposing||e.keyCode===229)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose()}
 }}>
  <div className="note-meta"><b>⚑ {note.cueNumber?'CUE '+String(note.cueNumber).padStart(3,'0'):'READ'} · {NOTE_LABELS[note.kind]}</b><span>{note.events.length}회</span></div>
  <div className="quick-memo-context">{note.scene}{note.actors.length?' · '+note.actors.join(' / '):''}<p>{note.original}</p></div>
  {note.memo&&<details><summary>기존 메모 보기</summary><p className="quick-memo-context">{note.memo}</p></details>}
  <label htmlFor="quick-error-reason">오류 메모</label>
  <textarea id="quick-error-reason" ref={input} value={memo} maxLength={10000} rows={3} placeholder="예: 가사 누락, 송출이 늦음, 배우가 다른 가사를 부름" onChange={e=>setMemo(e.target.value)} onCompositionStart={()=>{composing.current=true}} onCompositionEnd={()=>{composing.current=false}} onKeyDown={e=>{
   if(e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!composing.current&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();if(!e.repeat)save()}
  }}/>
  {error&&<p role="alert" className="import-error">{error}</p>}
  <div className="review-actions"><button type="button" onClick={onClose}>메모 없이 계속 · ESC</button><button type="submit" className="primary">저장 · Enter</button></div>
  <small className="muted">오류 표시는 이미 저장되었습니다. Shift+Enter 줄바꿈 · 관객 화면 유지</small>
 </form>
}
