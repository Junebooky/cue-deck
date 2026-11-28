import React,{useState} from 'react';
import {freeCueAnchors,editCount} from './cue-editor.mjs';
import OperatorCaption from './OperatorCaption.jsx';
const defaultKind=b=>b?.kind==='lyric'?'solo':b?.kind==='place'?'place':'black';
export default function AddCue({deck,initialAnchor,afterCue=null,busy,error,onSave,onClose}){
 const free=freeCueAnchors(deck),first=free.find(b=>b.id===initialAnchor)??free[0];
 const [anchor,setAnchor]=useState(afterCue?.blockId??first?.id??'');
 const [kind,setKind]=useState(afterCue?'black':defaultKind(first));
 const [trigger,setTrigger]=useState(afterCue?(afterCue.frame.trigger.slice(0,120)+' 후 · BLACK'):(first?.text.slice(0,200)??''));
 const [actor,setActor]=useState(first?.actor??''),[text,setText]=useState(first?.text??''),[second,setSecond]=useState(''),[secondActor,setSecondActor]=useState(''),[local,setLocal]=useState('');
 if(afterCue){
  const saveBlack=()=>{
   setLocal('');
   if(!trigger.trim()){setLocal('GO TRIGGER를 입력하세요.');return}
   onSave({action:'add-cue',afterFrameId:afterCue.frame.id,blockId:afterCue.blockId,frameId:'operator-'+crypto.randomUUID(),kind:'black',trigger,columns:[],expectedEditCount:editCount(deck)});
  };
  return <div className="cue-editor">
   <p><b>CUE {String(afterCue.index+1).padStart(3,'0')}</b> 다음에 <b>BLACK</b>(빈 화면) 큐를 추가합니다. 가사 사이 간주나 긴 공백 구간에 사용하세요.</p>
   {afterCue.text&&<div className="cue-editor-source">{afterCue.text}</div>}
   <label>GO TRIGGER<input autoFocus value={trigger} disabled={busy} onChange={e=>setTrigger(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&!busy){e.preventDefault();saveBlack()}}}/></label>
   <OperatorCaption view={{kind:'black',columns:[]}} variant="preview" exact/>
   {(local||error)&&<p role="alert" className="import-error">{local||error}</p>}
   <div className="review-actions"><button disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={busy} onClick={saveBlack}>블랙 큐 추가</button></div>
  </div>;
 }
 const b=free.find(x=>x.id===anchor),allowed=b?.kind==='lyric'?['solo','overlap','black']:b?.kind==='place'?['place','black']:['black'];
 const lines=text.split('\n'),other=second.split('\n'),n=Math.max(lines.length,kind==='overlap'?other.length:0);
 const columns=kind==='black'?[]:kind==='overlap'?[{actor,lines:[...lines,...Array(n-lines.length).fill('')]},{actor:secondActor,lines:[...other,...Array(n-other.length).fill('')]}]:[{actor:kind==='place'?'':actor,lines}];
 const save=()=>{setLocal('');if(!b||!trigger.trim()||columns.some(c=>!c.lines.some(l=>l.trim())||c.lines.length>6)||(kind==='overlap'&&columns.some(c=>!c.actor.trim()))){setLocal('송출 위치, 트리거 및 가사(열당 최대 6줄)를 확인하세요.');return}onSave({action:'add-cue',blockId:anchor,frameId:'operator-'+crypto.randomUUID(),kind,trigger,columns,expectedEditCount:editCount(deck)})};
 return <div className="cue-editor"><p>아직 송출 큐가 연결되지 않은 원본 카드에 큐를 추가합니다. 순서는 대본 위치에 맞춰 자동 정렬됩니다.</p><label>연결할 대본 카드<select value={anchor} disabled={busy} onChange={e=>{const b=free.find(x=>x.id===e.target.value);setAnchor(b.id);setKind(defaultKind(b));setTrigger(b.text.slice(0,200));setActor(b.actor);setText(b.text)}}>{free.map(b=><option key={b.id} value={b.id}>{b.id} · {b.text.slice(0,100)}</option>)}</select></label><label>큐 유형<select value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}>{allowed.map(k=><option key={k} value={k}>{({solo:'일반 가사',overlap:'동시 가창',place:'장소',black:'BLACK'})[k]}</option>)}</select></label>{kind!=='black'&&<><label>배우<input value={actor} onChange={e=>setActor(e.target.value)}/></label><label>가사<textarea aria-label="추가 가사" value={text} onChange={e=>setText(e.target.value)}/></label>{kind==='overlap'&&<><label>두 번째 배우<input value={secondActor} onChange={e=>setSecondActor(e.target.value)}/></label><label>두 번째 가사<textarea value={second} onChange={e=>setSecond(e.target.value)}/></label></>}</>}<label>GO TRIGGER<input value={trigger} onChange={e=>setTrigger(e.target.value)}/></label><OperatorCaption view={{kind,columns}} variant="preview" exact/>{(local||error)&&<p role="alert">{local||error}</p>}<div className="review-actions"><button disabled={busy} onClick={onClose}>취소</button><button className="primary" disabled={busy||!b} onClick={save}>큐 추가 저장</button></div></div>
}
