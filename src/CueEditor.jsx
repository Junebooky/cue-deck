import React,{useMemo,useState} from 'react';
import {editableCueAnchors,editCount} from './cue-editor.mjs';
import OperatorCaption from './OperatorCaption.jsx';
import {cueWidths} from './caption-widths.mjs';
import {effectiveStyle} from './caption-style.mjs';

export default function CueEditor({deck,frameId,settings,widths,busy,error,onSave,onDelete,onClose}){
 const frame=deck.frames.find(f=>f.id===frameId);
 const index=deck.frames.indexOf(frame);
 const {own,anchors,positions}=useMemo(()=>editableCueAnchors(deck,frameId),[deck,frameId]);
 const [start,setStart]=useState(own[0]),[count,setCount]=useState(own.length);
 const [trigger,setTrigger]=useState(frame.trigger);
 const [columns,setColumns]=useState(()=>frame.columns.map(c=>({actor:c.actor,text:c.lines.join('\n')})));
 const [localError,setLocalError]=useState('');
 const isLyric=['solo','overlap'].includes(frame.kind);
 const anchorMap=new Map(anchors.map(b=>[b.id,b]));
 const consecutive=[];
 for(let i=positions.get(start);Number.isInteger(i)&&i<deck.blocks.length&&consecutive.length<30;i++){
  const b=deck.blocks[i];if(!anchorMap.has(b.id))break;consecutive.push(b);
 }
 let lyricLimit=0;
 for(const b of consecutive){if(b.kind!=='lyric')break;lyricLimit++}
 const limit=isLyric?consecutive.length:frame.kind==='black'?Math.max(Math.min(1,consecutive.length),lyricLimit):Math.min(1,consecutive.length);
 const rows=columns.map(c=>({actor:c.actor,lines:c.text.split('\n')}));
 const active=rows.filter(c=>c.lines.some(l=>l.trim()));
 const kind=frame.kind==='black'||!active.length?'black':frame.kind==='place'?'place':active.length>1?'overlap':'solo';
 const n=Math.max(1,...active.map(c=>c.lines.length));
 const preview=active.length?{id:frame.id,kind,columns:active.map(c=>({...c,lines:kind==='solo'?c.lines.filter(l=>l.trim()):[...c.lines,...Array(n-c.lines.length).fill('')]}))}:{kind:'black',columns:[]};
 const edit=(i,patch)=>setColumns(old=>old.map((c,j)=>j===i?{...c,...patch}:c));
 const save=()=>{
  setLocalError('');
  if(count<1||count>limit||(active.length&&rows.some(c=>c.lines.length>6))){setLocalError('가사 내용 및 연결 카드 범위를 확인하세요.');return}
  if(kind==='overlap'&&active.some(c=>!c.actor.trim())){setLocalError('동시 가창 배우 이름을 입력하세요.');return}
  onSave({frameId,expectedEditCount:editCount(deck),trigger,columns:active.length?rows:[],sourceBlockIds:consecutive.slice(0,count).map(b=>b.id)});
 };
 return <div className="cue-editor">
  <div className="note-meta"><b>CUE {String(index+1).padStart(3,'0')}</b><span>현재 대본에 저장 · 원본 보존</span></div>
  <div className="cue-editor-preview"><div><small>현재 자막</small><OperatorCaption view={frame} exact scale={settings.style.scale} font={settings.style.font} ratios={cueWidths(widths,frame)} typography={effectiveStyle(settings,frame)}/></div><div><small>수정 후 자막</small><OperatorCaption view={preview} exact scale={settings.style.scale} font={settings.style.font} ratios={cueWidths(widths,preview)} typography={effectiveStyle(settings,preview)}/></div></div>
  {frame.kind!=='black'&&<><div className="note-meta"><b>자막 내용 / 줄바꿈</b>{isLyric&&<button disabled={busy||columns.length>=3} onClick={()=>setColumns(old=>[...old,{actor:'',text:''}])}>+ 가창 열</button>}</div><div className="cue-editor-columns">{columns.map((c,i)=><div key={i}>
   <label>배우 {i+1}<input value={c.actor} disabled={busy} onChange={e=>edit(i,{actor:e.target.value})}/></label>
   <label>가사 {i+1}<textarea aria-label={'가사 '+(i+1)} rows={4} disabled={busy} value={c.text} onChange={e=>edit(i,{text:e.target.value})}/></label>
   {isLyric&&columns.length>1&&<button disabled={busy} onClick={()=>setColumns(old=>old.filter((_,j)=>i!==j))}>이 열 제거</button>}
  </div>)}</div><small className="muted">줄바꿈은 Enter · 한 열만 남으면 일반 자막 · 두 열 이상은 분할 표시 · 내용을 모두 지우면 BLACK</small></>}
  <label>송출 위치 · 연결할 첫 대본 카드<select value={start} disabled={busy} onChange={e=>{setStart(e.target.value);setCount(1)}}>{anchors.map(b=><option key={b.id} value={b.id}>{positions.get(b.id)+1} · {b.actor} · {b.text.slice(0,110)}</option>)}</select></label>
  {(isLyric||(frame.kind==='black'&&limit>1))&&<label>연결할 연속 카드 수<select disabled={busy} value={count} onChange={e=>setCount(Number(e.target.value))}>{Array.from({length:limit},(_,i)=><option key={i} value={i+1}>{i+1}개</option>)}</select></label>}
  <div className="cue-editor-source">{consecutive.slice(0,count).map(b=><div key={b.id}>{b.text}</div>)}</div>
  <small className="muted">같은 장면·넘버의 다른 큐가 사용하지 않는 카드만 선택할 수 있습니다. 연결 위치에 따라 큐 순서는 자동 정렬됩니다.</small>
  <label>GO TRIGGER<input value={trigger} disabled={busy} onChange={e=>setTrigger(e.target.value)}/></label>
  {(localError||error)&&<p role="alert" className="import-error">{localError||error}</p>}
  <div className="review-actions"><button className="danger" disabled={busy||deck.frames.length<=1} onClick={onDelete}>큐 삭제</button><button disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={busy} onClick={save}>저장</button></div>
 </div>
}
