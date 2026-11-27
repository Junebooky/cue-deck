import {useEffect,useRef,useState} from 'react';
import {EMPTY_LOG,readLog,startSession,endSession,markNote,undoMark,editNote,appendNoteMemo} from './rehearsal.mjs';
const KEY='cue-deck.rehearsal-notes.v1';
const id=()=>crypto.randomUUID();
export function useRehearsal(active){
 const [initial]=useState(()=>{try{return {log:readLog(localStorage.getItem(KEY)),error:''}}catch(e){return {log:structuredClone(EMPTY_LOG),error:e.message}}});
 const [log,setLog]=useState(initial.log),[error,setError]=useState(initial.error),[sessionId,setSessionId]=useState(null),[message,setMessage]=useState('');
 const blocked=useRef(!!initial.error),current=useRef(initial.log),session=useRef(null),timer=useRef(null);
 const flash=text=>{setMessage(text);clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),2500)};
 const save=fn=>{
  if(blocked.current){setError('기존 리허설 기록을 읽을 수 없어 저장이 차단되었습니다.');return false}
  try{
   // Re-read persisted state before mutation to avoid overwriting another rehearsal tab's older snapshot.
   const next=fn(readLog(localStorage.getItem(KEY)));
   localStorage.setItem(KEY,JSON.stringify(next));current.current=next;setLog(next);setError('');return true;
  }catch(e){setError('리허설 저장 실패: '+e.message);return false}
 };
 const stop=()=>{const sid=session.current;if(!sid)return true;const ok=save(l=>endSession(l,sid,Date.now()));if(ok){session.current=null;setSessionId(null);flash('리허설 종료 · 기록 보존')}return ok};
 useEffect(()=>{if(session.current&&current.current.sessions.find(s=>s.id===session.current)?.active!==active){stop();session.current=null;setSessionId(null)}},[active]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{const sync=e=>{if(e.key===KEY){try{const next=readLog(e.newValue);current.current=next;setLog(next)}catch(err){blocked.current=true;setError(err.message)}}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const start=(deck,activeId)=>{
  if(session.current)return false;
  const sid=id(),now=Date.now();
  if(!save(l=>startSession(l,deck,activeId,sid,now)))return false;
  session.current=sid;setSessionId(sid);flash('리허설 시작 · E 오류 기록');return true;
 };
 const enabled=!!sessionId&&log.sessions.some(s=>s.id===sessionId&&s.active===active&&!s.endedAt);
 const mark=target=>{
  if(!session.current||!target)return false;
  if(!save(l=>markNote(l,session.current,target,id(),Date.now())))return false;
  flash('⚑ 오류 기록 완료 · 송출 유지');return current.current.notes.find(n=>n.sessionId===session.current&&n.key===target.key)??false;
 };
 const undo=()=>{if(!session.current)return false;const ok=save(l=>undoMark(l,session.current));if(ok)flash('최근 오류 기록 취소');return ok};
 const edit=(noteId,patch)=>save(l=>editNote(l,noteId,patch));
 const appendMemo=(noteId,value)=>save(l=>appendNoteMemo(l,noteId,value));
 return {log,error,sessionId,enabled,message,start,stop,mark,undo,edit,appendMemo};
}
