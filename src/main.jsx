import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {demo} from './demo.mjs';
import {initialPlayback,playback,viewFor} from './model.mjs';
import {MIN_READER_FONT,MAX_READER_FONT,defaultPrefs,cleanPrefs,fitLayout,buildNavigation,searchBlocks,cueTarget,stepMatch,pastUnit,followScrollOffset} from './operator-navigation.mjs';
import {loadBrowserLibrary,importBrowserDeck,activateBrowserDeck,compareBrowserDeck} from './browser-library.mjs';
import RevisionReview from './RevisionReview.jsx';
import OperatorCaption from './OperatorCaption.jsx';
import {buildCueGroups} from './cue-groups.mjs';
import {displaySource} from './source-display.mjs';
import {buildReaderSteps,readerTarget} from './reader-steps.mjs';
import {currentTarget} from './rehearsal.mjs';
import {shortcutLetter,blockedShortcutTarget} from './shortcuts.mjs';
import {useRehearsal} from './useRehearsal.js';
import RehearsalNotes from './RehearsalNotes.jsx';
import {MIN_SCALE,MAX_SCALE,SCALE_STEP,DEFAULT_SCALE,readScale,advanceStyleSequence} from './caption-scale.mjs';
import {useCaptionFit} from './useCaptionFit.js';
import CaptionScaleDialog from './CaptionScaleDialog.jsx';
import {CAPTION_FONTS,DEFAULT_FONT,readFont,fontFor,captionFamily} from './caption-fonts.mjs';
import {ensureCaptionFont,ensureStyledFont} from './local-fonts.js';
import {readSettings,effectiveStyle,editSettings} from './caption-style.mjs';
import {saveBrowserStyle} from './browser-library.mjs';
import CaptionStyleDialog from './CaptionStyleDialog.jsx';
import {cueWidths,assertWidthEdit,updateWidths} from './caption-widths.mjs';
import {saveBrowserWidths} from './browser-library.mjs';
import CaptionWidthsDialog from './CaptionWidthsDialog.jsx';
import './styles.css';
const api=window.deckAPI;
const black={kind:'black',columns:[]};
const blockKinds={lyric:'가사',dialogue:'드라마',nar:'NAR',direction:'무대 지시',place:'시간 · 장소',heading:'넘버 / 장면'};
const cueKinds={solo:'CUE',overlap:'DUET',place:'PLACE',black:'BLACK'};
function CueLabel({kind,status}){return <><span className="cue-kind-text">{cueKinds[kind]||'CUE'}</span>{status&&<span className={'cue-state '+status.toLowerCase()}>{status}</span>}</>}

function Caption({view,large=false,scale=DEFAULT_SCALE,font=DEFAULT_FONT,ratios=null,typography}){
 const ref=useRef(null),content=useRef(null);
 const fit=useCaptionFit(ref,content,view,scale,false,font,ratios,typography);
 const n=view.columns.length,rows=view.columns[0]?.lines.length||0;
 return <div ref={ref} className={'caption '+(large?'audience-caption':'monitor-caption')} data-font={font} data-ratios={fit.ratios.join(':')} data-wrap={fit.wrapped} data-lines={fit.lines} data-reduced={fit.reduced} data-risk={fit.tooSmall||fit.overflow} style={{fontFamily:captionFamily(font)}}><div ref={content} className="caption-grid" style={{gridTemplateColumns:'repeat('+Math.max(n,1)+', minmax(0,1fr))'}}>
 {n>1&&view.columns.map((c,i)=><div key={'h'+i} className="caption-actor">{c.actor}</div>)}
 {Array.from({length:rows},(_,r)=>view.columns.map((c,i)=><div className="caption-cell" key={r+':'+i}>{c.lines[r]||'\u00a0'}</div>))}
 </div></div>
}
function Audience(){
 const [frame,setFrame]=useState({sequence:-1,view:black,captionFont:DEFAULT_FONT});
 useEffect(()=>{
  if(!api)return;let alive=true,latestSequence=-1,loading=null;
  const receive=f=>{
   if(!alive||f.sequence<latestSequence)return;
   if(f.sequence===latestSequence&&loading===f.sequence)return;
   latestSequence=f.sequence;loading=f.sequence;
   const commit=()=>{if(alive&&f.sequence===latestSequence){loading=null;setFrame(old=>f.sequence>=old.sequence?{...f}:old)}};
   if(f.view.kind==='black'){commit();return}
   ensureStyledFont(readFont(f.captionFont),f.typography?.weight??600,f.view).then(commit).catch(()=>{if(f.sequence===latestSequence)loading=null});
  };
  const off=api.onOutput(receive);api.outputState().then(receive).catch(()=>{});return()=>{alive=false;off()};
 },[]);
 useEffect(()=>{if(frame.sequence<0)return;let a,b;a=requestAnimationFrame(()=>{b=requestAnimationFrame(()=>api?.ack(frame.sequence))});return()=>{cancelAnimationFrame(a);cancelAnimationFrame(b)}},[frame]);
 return <main className="audience"><Caption view={frame.view} scale={readScale(frame.captionScale)} font={readFont(frame.captionFont)} ratios={frame.ratios??null} typography={frame.typography} large/></main>
}
function PlaceIcon(){return <svg className="place-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/></svg>}
function SourceRuns({runs,text}){return Array.isArray(runs)?runs.map((r,i)=><span key={i} className={(r.bold?'source-bold ':'')+(r.red?'source-red ':'')+(r.italic?'source-italic':'')}>{r.text}</span>):text}
function loadBrowserScale(){try{return readScale(Number(localStorage.getItem('cue-deck.caption-scale.v1')||DEFAULT_SCALE))}catch{return DEFAULT_SCALE}}
function loadBrowserFont(){try{return readFont(localStorage.getItem('cue-deck.caption-font.v1'))}catch{return DEFAULT_FONT}}
const demoSnapshot={revision:0,captionScale:loadBrowserScale(),captionFont:loadBrowserFont(),deck:demo,state:initialPlayback(),active:'demo',versions:[{id:'demo',title:demo.title,revision:demo.revision,count:demo.frames.length}],output:{open:false,ready:false,displayId:null,ack:-1}};
function loadPrefs(){try{return cleanPrefs(JSON.parse(localStorage.getItem('cue-deck.operator.v1')||'{}'))}catch{return {...defaultPrefs}}}
function Splitter({label,value,min,max,onChange,onReset,direction=1}){
 const drag=useRef(null);
 return <div role="separator" tabIndex={0} aria-label={label} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(value)} className="splitter"
 onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,value};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault()}}
 onPointerMove={e=>{if(drag.current)onChange(drag.current.value+(e.clientX-drag.current.x)*direction)}}
 onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null}
 onDoubleClick={onReset} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();onChange(e.key==='Home'?min:e.key==='End'?max:value+(e.key==='ArrowRight'?12:-12)*direction)}}}><span/></div>
}
function Operator(){
 const [snap,setSnap]=useState(demoSnapshot),[selected,setSelected]=useState(null),[query,setQuery]=useState(''),[error,setError]=useState(''),[dialog,setDialog]=useState(null),[screens,setScreens]=useState([]),[display,setDisplay]=useState(''),[busy,setBusy]=useState(false);
 const inFlight=useRef(false),reader=useRef(null),latest=useRef(snap),workspace=useRef(null),searchInput=useRef(null),fileInput=useRef(null);
 const [libraryReady,setLibraryReady]=useState(false),[review,setReview]=useState(null),[holdCursor,setHoldCursor]=useState(null);
 const [prefs,setPrefs]=useState(loadPrefs),[workspaceWidth,setWorkspaceWidth]=useState(1400),[matchIndex,setMatchIndex]=useState(0),[collapsedActs,setCollapsedActs]=useState({}),[browseScene,setBrowseScene]=useState(null);
 const {sceneOpen,fontSize:size,follow}=prefs;
 const [expandedPast,setExpandedPast]=useState(()=>new Set());
 const setPref=(key,value)=>setPrefs(old=>cleanPrefs({...old,[key]:value}));
 useEffect(()=>{try{localStorage.setItem('cue-deck.operator.v1',JSON.stringify(prefs))}catch{}},[prefs]);
 useLayoutEffect(()=>{const el=workspace.current;if(!el)return;const update=()=>setWorkspaceWidth(el.clientWidth);const ro=new ResizeObserver(update);ro.observe(el);update();return()=>ro.disconnect()},[]);
 const widths=fitLayout(workspaceWidth,prefs);
 const {deck,state,output}=snap;
 const [widthIndex,setWidthIndex]=useState(null);
 const widthsByCue=snap.captionWidths??{};const settings=useMemo(()=>readSettings(snap.captionSettings,snap.captionFont,snap.captionScale),[snap.captionSettings,snap.captionFont,snap.captionScale]);const captionScale=settings.style.scale,captionFont=settings.style.font;
 const [styleIndex,setStyleIndex]=useState(null);const frames=deck.frames;const {sequential,target:next,jump:armedJump}=cueTarget(state.index,selected,frames.length);
 const navigation=useMemo(()=>buildNavigation(deck),[deck]);
 const reading=useMemo(()=>buildReaderSteps(deck),[deck]);
 const holdKey=holdCursor?.active===snap.active&&holdCursor?.index===state.index&&viewFor(deck,state).kind==='black'?holdCursor.key:null;
 useEffect(()=>{setHoldCursor(null)},[snap.active,output.open]);
 const holdStep=holdKey?reading.steps[reading.positions.get(holdKey)]:null;
 const nextRead=readerTarget(reading,state.index,holdKey,1);
 const previousRead=readerTarget(reading,state.index,holdKey,-1);
 const liveIndex=holdStep?null:state.index;
 const rehearsal=useRehearsal(snap.active);
 const grouping=useMemo(()=>buildCueGroups(deck),[deck]);
 const currentBlockId=holdStep?.blockId??frames[state.index]?.blockId;
 const blockPositions=useMemo(()=>new Map(deck.blocks.map((b,i)=>[b.id,i])),[deck]);
 const protectedIds=new Set([currentBlockId,nextRead?.blockId,...(next==null?[]:grouping.ranges.get(next)??[frames[next]?.blockId])]);
 useEffect(()=>setExpandedPast(new Set()),[snap.active,currentBlockId]);
 const togglePast=key=>setExpandedPast(old=>{const n=new Set(old);n.has(key)?n.delete(key):n.add(key);return n});
 const markTarget=useMemo(()=>currentTarget(deck,snap.active,state.index,holdStep,grouping.ranges),[deck,snap.active,state.index,holdStep,grouping]);
 const canMark=libraryReady&&!busy&&rehearsal.enabled&&!!markTarget&&!output.testing&&(!output.open||output.ready);
 const [shortcutNotice,setShortcutNotice]=useState('');
 const shortcutTimer=useRef(null);
 const showShortcutNotice=message=>{setShortcutNotice(message);clearTimeout(shortcutTimer.current);shortcutTimer.current=setTimeout(()=>setShortcutNotice(''),2400)};
 useEffect(()=>()=>clearTimeout(shortcutTimer.current),[]);
 const notesByKey=useMemo(()=>{const m=new Map();for(const n of rehearsal.log.notes)if(n.sessionId===rehearsal.sessionId&&n.active===snap.active)m.set(n.key,n.events.length);return m},[rehearsal.log,rehearsal.sessionId,snap.active]);
 const markBadge=key=>notesByKey.has(key)?<span className="error-mark" title="리허설 오류 기록">⚑ 오류 {notesByKey.get(key)}회</span>:null;
 const sceneId=navigation.blockById.get(holdStep?.blockId??frames[state.index]?.blockId)?.sceneId;
 const scene=navigation.byScene.get(sceneId)?.scene;
 const matches=useMemo(()=>searchBlocks(deck.blocks,query),[deck.blocks,query]);
 const matchSet=useMemo(()=>new Set(matches),[matches]);
 const activeMatch=matches[matchIndex]??null;
 const num=i=>i==null||i<0?'—':String(i+1).padStart(3,'0');
 const browse=(id)=>{if(!id)return;const s=navigation.blockById.get(id)?.sceneId;setBrowseScene(s??null);requestAnimationFrame(()=>requestAnimationFrame(()=>jump(id,true,true)))};
 const returnToCurrent=()=>{setQuery('');setBrowseScene(null);setExpandedPast(new Set());requestAnimationFrame(()=>requestAnimationFrame(()=>jump(currentBlockId)))};
 const seekMatch=(delta)=>{const i=stepMatch(matchIndex,delta,matches.length);if(i>=0){setMatchIndex(i);browse(matches[i])}};
 useEffect(()=>{setMatchIndex(0);if(matches.length)browse(matches[0])},[query,matches.length]);

 useEffect(()=>{let alive=true;const receive=s=>{if(alive&&s.revision>=latest.current.revision){latest.current=s;setSnap(s)}};const off=api?.onState(receive);const pending=api?api.state():loadBrowserLibrary(latest.current);pending.then(receive).catch(e=>{if(alive)setError(e.message)}).finally(()=>{if(alive)setLibraryReady(true)});return()=>{alive=false;off?.()}},[]);
 const apply=s=>{if(s.revision>=latest.current.revision){latest.current=s;setSnap(s)}};
 const run=async(fn)=>{if(inFlight.current)return null;inFlight.current=true;setBusy(true);setError('');try{const result=await fn();if(result?.deck)apply(result);return result}catch(e){setError(e.message);return null}finally{inFlight.current=false;setBusy(false)}};
 const jump=(id,exact=false,browsing=false)=>{if(!id)return;const root=reader.current,node=document.getElementById('block-'+id);if(root&&node){const target=exact?node:node.closest('.cue-group')||node;const rect=target.getBoundingClientRect();const top=rect.top-root.getBoundingClientRect().top+root.scrollTop;
  const nextRects=[...root.querySelectorAll('.cue-group.next,.block.next,.block.reading-next')].map(el=>el.getBoundingClientRect()).filter(r=>r.height>0&&r.top>=rect.bottom-2).sort((a,b)=>a.top-b.top);
  const span=nextRects.length?nextRects[0].bottom-rect.top:rect.height;
  const offset=browsing?root.clientHeight*.30:followScrollOffset(root.clientHeight,span);
  root.scrollTo({top:Math.max(0,top-offset),behavior:'instant'})}};
 const command=async(type,index)=>{if(inFlight.current)return;const result=await run(async()=>{if(api)return api.command({type,index});const s=latest.current;return {...s,state:playback(s.state,{type,index},s.deck.frames.length)}});if(result&&['GO','PREV'].includes(type)){setHoldCursor(null);setSelected(null);if(follow){setQuery('');setBrowseScene(null);const id=result.deck.frames[result.state.index]?.blockId;requestAnimationFrame(()=>requestAnimationFrame(()=>jump(id)))}}return result};
 const go=()=>{if(next===null)return;if(armedJump){setDialog('jump');return}command('GO',next)};
 const disabled=!libraryReady||busy||output.testing||(output.open&&!output.ready);
 const stepReader=async(delta)=>{
  if(disabled||inFlight.current)return;
  const target=readerTarget(reading,state.index,holdKey,delta);if(!target)return;
  if(target.kind==='cue'){const result=await command('GO',target.index);if(result&&!follow){setQuery('');setBrowseScene(null);requestAnimationFrame(()=>requestAnimationFrame(()=>jump(target.blockId)))}return}
  // Entering unanchored drama/NAR is a manual BLACK, not a new audience cue.
  // Subsequent dialogue cards do not resend an already black frame.
  const before=latest.current;
  const result=viewFor(before.deck,before.state).kind==='black'?before:await command('BLACK');
  if(!result||result.active!==before.active||result.state.index!==before.state.index)return;
  setSelected(null);setHoldCursor({active:result.active,index:result.state.index,key:target.key});
  setQuery('');setBrowseScene(null);requestAnimationFrame(()=>requestAnimationFrame(()=>jump(target.blockId,true)))
 };
 const blackAction=()=>!holdStep&&!output.testing&&state.blackout&&state.index>=0?'RESTORE':'BLACK';
 const triggerBlack=()=>{
  const type=blackAction();
  if(!libraryReady||inFlight.current||(type==='RESTORE'&&disabled)){showShortcutNotice('송출 준비 중 · 잠시 후 B를 다시 누르세요');return}
  command(type);
 };
 const triggerMark=()=>{
  if(!rehearsal.enabled){showShortcutNotice('E · 리허설 노트에서 새 리허설을 시작하세요');return}
  if(!canMark||inFlight.current){showShortcutNotice('E · 활성 대본 및 송출 준비 상태를 확인하세요');return}
  rehearsal.mark(markTarget);
 };
 // Capture phase avoids losing B/E when a focused console button handles input.
 // Keep editors, settings dialogs, IME composition, and resize handles protected.
 const requestEnd=()=>{if(output.open&&!inFlight.current)setDialog('end-output')};
 const endPerformance=async()=>{if(!api||!output.open||inFlight.current)return;const result=await run(()=>api.stop());if(result){setHoldCursor(null);setSelected(null);setDialog(null)}};
 const keyHandler=useRef(null);
 keyHandler.current=e=>{
  if(e.isComposing||e.defaultPrevented)return;
  const key=String(e.key??'').toLowerCase();
  const editing=blockedShortcutTarget(e.target)||blockedShortcutTarget(document.activeElement);
  if(key==='escape'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!e.repeat){
   if(editing)return; // Search and edit fields retain their own ESC behavior.
   if(dialog){e.preventDefault();if(!busy)setDialog(null);return}
   if(output.open){e.preventDefault();requestEnd();return}
  }
  if(dialog||editing)return;
  if((e.ctrlKey||e.metaKey)&&key==='f'){e.preventDefault();searchInput.current?.focus();return}
  if((e.ctrlKey||e.metaKey)&&key==='z'&&!e.shiftKey&&!e.repeat&&!e.altKey&&rehearsal.enabled){e.preventDefault();rehearsal.undo();return}
  const letter=shortcutLetter(e);
  if(letter){
   e.preventDefault();
   if(e.repeat)return;
   if(letter==='black')triggerBlack();else triggerMark();
   return;
  }
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target?.tagName==='BUTTON')return;
  if(e.code==='Space'){e.preventDefault();if(!disabled)go()}
  else if(e.key==='ArrowRight'){e.preventDefault();stepReader(1)}
  else if(e.key==='ArrowLeft'){e.preventDefault();stepReader(-1)}
 };
 useEffect(()=>{const fn=e=>keyHandler.current?.(e);window.addEventListener('keydown',fn,true);return()=>window.removeEventListener('keydown',fn,true)},[]);
 const openSetup=async()=>{if(!api){setError('외부 디스플레이 송출은 Electron 앱에서 실행하세요.');return}try{const ds=await api.displays();setScreens(ds);setDisplay(String(ds.find(d=>!d.operator)?.id??''));setDialog('output')}catch(e){setError(e.message)}};
 const activateVersion=async(id,options)=>{
  const r=await run(()=>api?api.activate(id,options):activateBrowserDeck(id,latest.current,options));
  if(r){setHoldCursor(null);setSelected(null);setQuery('');setBrowseScene(null);setCollapsedActs({});setReview(null);setDialog('scripts');requestAnimationFrame(()=>jump(r.deck.blocks[0]?.id))}
 };
 const inspectVersion=async(id,activateOther=false)=>{
  const result=await run(()=>api?api.compare(id):compareBrowserDeck(id));
  if(!result)return;
  if(!result.comparable&&activateOther){await activateVersion(id,{expectedActive:result.baseId,reviewed:false});return}
  setReview(result);setDialog('review');
 };
 const frameByBlock=navigation.byBlock;
 const preview=next===null?black:frames[next];
 const programStyle=effectiveStyle(settings,output.testing?null:frames[state.index]),previewStyle=effectiveStyle(settings,preview);
 const saveStyle=async(index,value)=>{const expected=snap.active;return run(async()=>{const s=latest.current;if(s.active!==expected)throw Error('대본이 변경되었습니다.');const updated=editSettings(readSettings(s.captionSettings,s.captionFont,s.captionScale),s.deck,index,value,s.output.open,s.state.index);if(index===null)await ensureStyledFont(updated.style.font,updated.style.weight,viewFor(s.deck,s.state),preview);if(api)return api.setCaptionStyle(expected,index,value);await saveBrowserStyle(expected,updated);return {...s,revision:s.revision+1,captionSettings:updated,state:index===null?advanceStyleSequence(s.state):s.state}})};
 const openStyle=(index,reviewMode=false)=>{setStyleIndex(index);setDialog(reviewMode?'long-review':'caption-style')};
 const programRatios=cueWidths(widthsByCue,frames[state.index]);
 const previewRatios=cueWidths(widthsByCue,preview);
 const openWidths=index=>{setWidthIndex(index);setDialog('caption-widths')};
 const applyWidths=async(index,value)=>{const expected=snap.active;return run(async()=>{if(api)return api.setCaptionWidths(expected,index,value);const s=latest.current;const frame=assertWidthEdit(s.deck,s.active,expected,index,value,false,s.state.index);const next=updateWidths(s.captionWidths??{},frame,value);await saveBrowserWidths(s.active,next);return {...s,revision:s.revision+1,captionWidths:next}})};
 const applyCaptionFont=async(value)=>{
  if(value===captionFont)return;
  await run(async()=>{
   await ensureCaptionFont(value,viewFor(deck,state),preview);
   if(api)return api.setCaptionFont(value);
   localStorage.setItem('cue-deck.caption-font.v1',value);
   const s=latest.current;return {...s,revision:s.revision+1,captionFont:value,state:advanceStyleSequence(s.state)}
  });
 };
 const applyCaptionScale=async(value)=>{
  const r=await run(()=>{if(api)return api.setCaptionScale(value);localStorage.setItem('cue-deck.caption-scale.v1',String(value));const s=latest.current;return {...s,revision:s.revision+1,captionScale:value,state:advanceStyleSequence(s.state)}});
  if(r)setDialog(null);
 };
 return <main className="console" onClick={e=>{if(e.detail>0&&!dialog)e.target.closest?.('button')?.blur()}}>
 <header className="top"><div className="brand">◈ <b>cue.deck</b><span className="muted"> / {deck.title}</span></div><div className="toolbar"><span className="pill">{deck.revision}</span><button className={rehearsal.enabled?'rehearsal-on':''} disabled={!libraryReady||busy} onClick={()=>setDialog('rehearsal')}>{rehearsal.enabled?'● REHEARSAL':'리허설 노트'}{rehearsal.enabled?' · '+notesByKey.size+'건':''}</button><button onClick={()=>setDialog('scripts')} disabled={!libraryReady||output.open||busy}>대본 관리</button><button className={output.open?'':'primary'} title={output.open?'공연 종료 (ESC)':'공연 시작'} onClick={()=>output.open?requestEnd():openSetup()} disabled={!libraryReady||busy}>{output.open?'공연 종료':'▶ 공연 시작'}</button></div></header>
 <div className="status"><button onClick={()=>setPref('sceneOpen',!sceneOpen)} aria-expanded={sceneOpen}>☰ SCENES</button><span className="status-scene" title={scene?.label}>{scene?'ACT '+scene.act+' / '+scene.label:'공연 대기'}</span><span className="muted">MANUAL · {api?'LOCAL':'브라우저 연습 모드'}</span><span className="grow"/><button className="caption-scale-button" disabled={!libraryReady||busy||output.open} onClick={()=>openWidths(null)}>동시 가창 검수</button><button className="caption-scale-button" disabled={!libraryReady||busy||output.open} onClick={()=>openStyle(null,true)}>장문 가사 검수</button><button className="caption-scale-button" disabled={!libraryReady||busy||(output.open&&!output.ready)} onClick={()=>openStyle(null)}>자막 스타일 <b>{captionScale}%</b></button><span className={output.ready?'connected':'muted'}>{output.testing?'● OUTPUT TEST':output.ready?'● OUTPUT CONNECTED':output.open?'● OUTPUT WAITING':'○ OUTPUT OFFLINE'}</span>{output.open&&<button className="output-test-button" disabled={!output.ready||busy} onClick={()=>run(()=>api.testOutput(!output.testing))}>{output.testing?'테스트 종료 · BLACK':'화면 테스트'}</button>}</div>
 <div ref={workspace} className="workspace adjustable" style={{gridTemplateColumns:sceneOpen?widths.left+'px 10px minmax(320px, 1fr) 10px '+widths.right+'px':'minmax(320px, 1fr) 10px '+widths.right+'px'}}>
 {sceneOpen&&<><aside className="scenes panel"><div className="panel-title">SCENE EXPLORER <button title="장면 메뉴 접기" onClick={()=>setPref('sceneOpen',false)}>‹</button></div>{[1,2].map(act=><section key={act}><button className="act-toggle" aria-expanded={!collapsedActs[act]} onClick={()=>setCollapsedActs(o=>({...o,[act]:!o[act]}))}>{collapsedActs[act]?'▸':'▾'} ACT {String(act).padStart(2,'0')} <small>{deck.scenes.filter(s=>s.act===act).length} scenes</small></button>{!collapsedActs[act]&&deck.scenes.filter(s=>s.act===act).map(s=>{const item=navigation.byScene.get(s.id);const liveScene=s.id===sceneId;const browsed=s.id===browseScene;const count=item.cues.length;const done=item.cues.filter(i=>i<=state.index).length;return <div key={s.id} className={'scene-group '+(liveScene?'is-live ':'')+(browsed?'is-browsed':'')}><button className="scene" title={s.label} onClick={()=>browse(item.blocks[0]?.id)}><span>{s.label}</span><small>{liveScene?'● LIVE · ':''}{done}/{count} cues</small></button>{(liveScene||browsed)&&item.numbers.map((n,i)=><button key={i} className="song-link" title={n.label} onClick={()=>browse(n.blockId)}>{n.label}</button>)}</div>})}</section>)}</aside><Splitter label="장면 패널 너비" value={widths.left} min={150} max={340} onChange={v=>setPref('sceneWidth',v)} onReset={()=>setPref('sceneWidth',defaultPrefs.sceneWidth)}/></>}
 <section className="script panel"><div className="panel-title script-title">SCRIPT <div className="toolbar"><button aria-pressed={follow} className={follow?'follow-active':''} title="SPACE 송출 시 대본 자동 스크롤 (방향키는 항상 대본 위치 이동)" onClick={()=>setPref('follow',!follow)}>FOLLOW {follow?'ON':'OFF'}</button><button aria-label="대본 글자 작게" title="대본 글자 및 카드 밀도 줄이기" disabled={size<=MIN_READER_FONT} onClick={()=>setPref('fontSize',size-1)}>A−</button><button className="reader-size-reset" title="기본 크기 17px로 복원" aria-label="대본 글자 크기 초기화" onClick={()=>setPref('fontSize',defaultPrefs.fontSize)}>{size}px</button><button aria-label="대본 글자 크게" title="대본 글자 크게" disabled={size>=MAX_READER_FONT} onClick={()=>setPref('fontSize',size+1)}>A+</button></div></div><div className="search"><input ref={searchInput} aria-label="대사 · 가사 검색" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();seekMatch(e.shiftKey?-1:1)}else if(e.key==='Escape'){setQuery('');e.currentTarget.blur()}}} placeholder="대사 · 가사 검색 (⌘/Ctrl F)"/>{query&&<><span className="search-count">{matches.length?matchIndex+1:0}/{matches.length}</span><button aria-label="이전 검색 결과" disabled={!matches.length} onClick={()=>seekMatch(-1)}>↑</button><button aria-label="다음 검색 결과" disabled={!matches.length} onClick={()=>seekMatch(1)}>↓</button><button aria-label="검색 지우기" onClick={()=>setQuery('')}>×</button></>}</div><div className="script-legend" aria-label="대본 유형 범례">{[['lyric','가사'],['dialogue','드라마'],['nar','NAR'],['direction','무대 지시'],['place','장소']].map(([k,label])=><span key={k} className={'block-kind kind-'+k}>{label}</span>)}</div><div className="script-location"><span>{browseScene?'탐색 중 · 송출 유지':'원본 대본 · 이전 구간 자동 압축'}{grouping.unresolved>0&&deck.productionId!=='demo'&&<span className="group-legacy" title="검증된 sourceBlockIds가 포함된 최신 JSON을 대본 관리에서 활성화하세요"> · 미확인 큐 {grouping.unresolved}개</span>}</span><div className="toolbar"><button disabled={!holdStep&&state.index<0} onClick={returnToCurrent}>현재 위치</button><button disabled={!nextRead} onClick={()=>browse(nextRead?.blockId)}>다음 대본 위치</button></div></div><div className="reader-status"><span>{holdStep?'드라마 / NAR 읽는 중 · 관객 BLACK':'← → 대본 · SPACE 송출 · B / Ctrl+B 검정'}</span>{nextRead?.kind==='hold'&&<span className="reader-next-hint">다음: {navigation.blockById.get(nextRead.blockId)?.kind==='nar'?'NAR':'드라마'} · BLACK</span>}</div><div ref={reader} className={'script-scroll'+(size<=12?' reader-dense':'')} style={{fontSize:size}}>
 {grouping.units.map(unit=>{
 const grouped=unit.blocks.length>1;
 const isPast=pastUnit(unit,blockPositions,currentBlockId,protectedIds);
 const compact=isPast&&!query.trim()&&!browseScene;
 const expanded=expandedPast.has(unit.key);
 const isCollapsed=compact&&!expanded;
 const unitCue=unit.index??frameByBlock.get(unit.blocks[0].id)?.[0];
 const summary=unit.blocks.map(b=>displaySource(b).text).join(' / ').replace(/\s+/g,' ').trim();
 const noteCount=unit.blocks.reduce((sum,b)=>sum+(notesByKey.get('read:'+b.id)||0),0)+(unitCue==null?0:notesByKey.get('cue:'+frames[unitCue].id)||0);
 const wrap=content=><div key={unit.key} className={'reader-unit'+(compact?' past-unit':'')}>
 {compact&&<button className="past-summary" aria-expanded={expanded} aria-label={'이전 대본 '+(unitCue==null?unit.blocks[0].id:'큐 '+num(unitCue))} onClick={()=>togglePast(unit.key)} title={summary}><span className="past-id">{unitCue==null?(blockKinds[unit.blocks[0].kind]||'이전'):num(unitCue)}</span><span className="past-text">{summary}</span>{noteCount>0&&<span className="past-mark">⚑ {noteCount}</span>}<span aria-hidden="true">{expanded?'▴':'▾'}</span></button>}
 <div className="reader-unit-content" hidden={isCollapsed}>{content}</div></div>;
 const i=unit.index;
 const groupStatus=i===liveIndex?'LIVE':i===next?'NEXT':null;
 const renderBlock=(b)=>{
 const indices=frameByBlock.get(b.id)||[];const readingNow=holdStep?.blockId===b.id;const readingNext=nextRead?.kind==='hold'&&nextRead.blockId===b.id;
 if(b.kind==='heading')return <article id={'block-'+b.id} key={b.id} className={'block heading script-divider'+(matchSet.has(b.id)?' search-hit':'')+(activeMatch===b.id?' active-hit':'')} aria-label="넘버 / 장면">
 <div className="divider-rule"><span aria-hidden="true"/><div className="divider-text"><SourceRuns runs={b.runs} text={b.text}/></div><span aria-hidden="true"/></div>
 {indices.length>0&&<div className="divider-cues">{indices.map(i=><button key={i} className={'cue-tag cue-'+frames[i].kind+(i===next?' armed':'')+(i===liveIndex?' on-air':'')} aria-label={'큐 '+num(i)+' 미리보기'} onClick={()=>setSelected(i)}><span className="cue-number">{num(i)}</span><CueLabel kind={frames[i].kind} status={i===liveIndex?'LIVE':i===next?'NEXT':null}/></button>)}</div>}
 </article>;
 return <article id={'block-'+b.id} key={b.id} data-cue-status={grouped?groupStatus||undefined:undefined} className={'block '+(!grouped&&indices.includes(liveIndex)?'live ':'')+(!grouped&&indices.includes(next)?'next ':'')+(grouped?'group-member ':'')+(readingNow?'reading-hold ':'')+(readingNext?'reading-next ':'')+b.kind+(matchSet.has(b.id)?' search-hit':'')+(activeMatch===b.id?' active-hit':'')}><div className="block-meta"><span className={'block-kind kind-'+b.kind}>{blockKinds[b.kind]||b.kind}</span><span className="actor-label">{b.actor}</span>{readingNow&&<span className="read-hold-label">READ · BLACK</span>}{!grouped&&markBadge('read:'+b.id)}{!grouped&&indices.map(i=><React.Fragment key={'mark-'+i}>{markBadge('cue:'+frames[i].id)}</React.Fragment>)}{readingNext&&<span className="read-next-label">다음 대본 · BLACK</span>}{b.number&&b.kind==='heading'&&<span className="muted">{b.number}</span>}{!grouped&&indices.map(i=><button key={i} className={'cue-tag cue-'+frames[i].kind+(i===next?' armed':'')+(i===liveIndex?' on-air':'')} aria-label={'큐 '+num(i)+' 미리보기'} onClick={()=>setSelected(i)}><span className="cue-number">{num(i)}</span><CueLabel kind={frames[i].kind} status={i===liveIndex?'LIVE':i===next?'NEXT':null}/></button>)}</div>{b.kind==='place'&&<div className="place-card-icon"><PlaceIcon/></div>}<div className="block-text">{b.sourceCells?<div className="grid gap-3" style={{gridTemplateColumns:"repeat("+b.sourceCells.length+", minmax(0, 1fr))"}}>{b.sourceCells.map((cell,i)=><div key={i} className="min-w-0">{cell?<SourceRuns text={cell} runs={b.cellRuns?.[i]}/>: "\u00a0"}</div>)}</div>:<SourceRuns {...displaySource(b)}/>}</div></article>};
 if(!grouped)return wrap(renderBlock(unit.blocks[0]));
 return wrap(<section key={unit.key} className={'cue-group block-group '+(i===liveIndex?'live ':'')+(i===next?'next ':'')} data-cue-index={i} aria-label={'큐 '+num(i)+' 가사 그룹'}>
 <div className="cue-group-header"><span className="cue-group-title">{groupStatus==='LIVE'?'PROGRAM · LIVE':groupStatus==='NEXT'?'PREVIEW · NEXT':'송출 가사 그룹'}</span><span className="cue-group-count">{unit.blocks.length}개 원본 카드</span>{markBadge('cue:'+frames[i].id)}<button className={'cue-tag cue-'+frames[i].kind+(i===next?' armed':'')+(i===liveIndex?' on-air':'')} aria-label={'큐 '+num(i)+' 미리보기'} onClick={()=>setSelected(i)}><span className="cue-number">{num(i)}</span><CueLabel kind={frames[i].kind} status={groupStatus}/></button></div>
 {unit.blocks.map(renderBlock)}
 </section>)
 })}
 </div></section>
 <Splitter label="송출 모니터 너비" value={widths.right} min={260} max={600} direction={-1} onChange={v=>setPref('monitorWidth',v)} onReset={()=>setPref('monitorWidth',defaultPrefs.monitorWidth)}/>
 <aside className="monitors panel"><div className="monitor-label live-label"><div className="program-title"><i className="program-lamp" aria-hidden="true"/> PROGRAM <small className="program-mode">{output.ready?'ON AIR':output.open?'WAIT':'PREVIEW'}</small></div><span>{num(state.index)} / {frames.length}</span></div><OperatorCaption view={output.testing?output.testView??black:viewFor(deck,state)} variant="program" scale={captionScale} font={captionFont} ratios={programRatios} typography={programStyle}/><div className="monitor-label preview-label">● {armedJump?'JUMP PREVIEW':'PREVIEW'} <span>{num(next)}</span></div><OperatorCaption view={preview} variant="preview" scale={captionScale} font={captionFont} ratios={previewRatios} typography={previewStyle}/>{preview.kind==='solo'&&<button className="width-edit-button" disabled={busy||!libraryReady||(output.open&&next===state.index)} onClick={()=>openStyle(next,true)}>장문 · 큐 스타일 조절</button>}{preview.kind==='overlap'&&<button className="width-edit-button" disabled={busy||!libraryReady||(output.open&&next===state.index)} onClick={()=>openWidths(next)}>열 너비 · {previewRatios?previewRatios.join(':'):'AUTO'} · 조절</button>}<div className="trigger"><div className="trigger-heading"><span className="muted text-xs">GO TRIGGER</span>{next!==null&&<span className={'cue-tag cue-'+frames[next].kind}><CueLabel kind={frames[next].kind} status="NEXT"/></span>}</div><b>{next===null?'마지막 큐 완료':frames[next].trigger}</b>{armedJump&&<div className="jump-warning">비순차 큐 선택 · GO 확인 필요</div>}{selected!==null&&<button onClick={()=>setSelected(null)}>순차 진행으로 복귀</button>}</div><div className="muted text-xs tracking-widest">UP NEXT</div>{frames.slice((next??frames.length)+1,(next??frames.length)+4).map(f=><div className="upnext" key={f.id}><small>{num(frames.indexOf(f))}</small><span className={'mini-kind cue-'+f.kind}>{cueKinds[f.kind]}</span><span>{f.trigger}</span></div>)}</aside>
 </div>
 {output.error&&!output.open&&<div className="output-failure" role="status">{output.error}</div>}{error&&<div role="alert" className="error">{error}<button onClick={()=>setError('')}>닫기</button></div>}
 {shortcutNotice&&<div className="shortcut-feedback" role="status">{shortcutNotice}</div>}
 {(rehearsal.message||rehearsal.error)&&<div className={rehearsal.error?'rehearsal-feedback failure':'rehearsal-feedback'} role="status">{rehearsal.error||rehearsal.message}</div>}
 <footer className="transport">{rehearsal.enabled&&<button className="mark-button" title="E / Ctrl+E · 현재 활성 대본 오류 기록" disabled={!canMark} onClick={triggerMark}>⚑ E · 오류 기록</button>}<button disabled={disabled||!previousRead} onClick={()=>stepReader(-1)} title="이전 대본 단계 (←)">← 대본</button><button disabled={disabled||!nextRead} onClick={()=>stepReader(1)} title="다음 대본 단계 (→)">대본 →</button><button className="primary go" disabled={disabled||next===null} onClick={go}>{armedJump?'선택 큐 확인':'GO'} <small>SPACE · 다음 송출 큐</small></button><button title="B / Ctrl+B · BLACK / RESTORE" onClick={triggerBlack} disabled={!libraryReady||busy||(!holdStep&&!output.testing&&state.blackout&&state.index>=0&&disabled)}>■ {!holdStep&&!output.testing&&state.blackout&&state.index>=0?'RESTORE':'BLACK'}</button></footer>
 <div className="foot"><span>LOCAL PERFORMANCE CONSOLE · {deck.productionId==='demo'?'테스트 대본':'공연 대본'}</span><span className="progress-label">{Math.max(0,state.index+1)} / {frames.length}</span><progress aria-label="공연 진행률" max={frames.length} value={Math.max(0,state.index+1)}/></div>
 {dialog&&<div className="overlay" role="dialog" aria-modal="true" aria-label={dialog==='end-output'?'공연 종료 확인':undefined}><div className={['review','rehearsal','caption-widths','caption-style','long-review'].includes(dialog)?'modal review-modal':'modal'}><div className="panel-title">{dialog==='caption-style'?'자막 스타일 설정':dialog==='long-review'?'장문 가사 검수':dialog==='caption-widths'?'동시 가창 자막 검수':dialog==='end-output'?'공연 종료 확인':dialog==='rehearsal'?'REHEARSAL NOTES':dialog==='caption-scale'?'관객 자막 크기':dialog==='output'?'공연 송출 설정':dialog==='jump'?'비순차 송출 확인':dialog==='review'?'SCRIPT REVISION REVIEW':'SCRIPT MANAGER'}<button onClick={e=>{e.currentTarget.blur();setDialog(null)}}>닫기</button></div>{['caption-style','long-review'].includes(dialog)?<CaptionStyleDialog key={dialog+':'+styleIndex} deck={deck} settings={settings} widths={widthsByCue} initialIndex={styleIndex} reviewMode={dialog==='long-review'} sample={viewFor(deck,state).kind!=='black'?viewFor(deck,state):preview} busy={busy||(output.open&&!output.ready)} outputOpen={output.open} currentIndex={state.index} error={error} onApply={saveStyle} onClose={()=>setDialog(null)}/>:dialog==='caption-widths'?<CaptionWidthsDialog deck={deck} initialIndex={widthIndex} overrides={widthsByCue} scale={captionScale} font={captionFont} typography={settings.style} busy={busy} outputOpen={output.open} currentIndex={state.index} onApply={applyWidths} error={error}/>:dialog==='end-output'?<><p>관객용 송출 창을 닫고 공연을 종료합니다. 대본 및 리허설 기록은 유지됩니다.</p><div className="end-output-actions"><button disabled={busy} onClick={()=>setDialog(null)}>취소 · ESC</button><button autoFocus className="primary" disabled={busy||!output.open} onClick={endPerformance}>공연 종료 · Enter</button></div>{error&&<div role="alert" className="import-error">{error}</div>}</>:dialog==='rehearsal'?<RehearsalNotes r={rehearsal} deck={deck} active={snap.active} canStart={libraryReady&&!busy&&!output.testing} onClose={()=>setDialog(null)} onJump={id=>{setDialog(null);setQuery('');requestAnimationFrame(()=>requestAnimationFrame(()=>browse(id)))}}/>:dialog==='caption-scale'?<CaptionScaleDialog current={captionScale} font={captionFont} ratios={viewFor(deck,state).kind!=='black'?programRatios:previewRatios} view={viewFor(deck,state).kind!=='black'?viewFor(deck,state):preview.kind!=='black'?preview:frames.find(f=>f.kind==='solo')??black} busy={busy||(output.open&&!output.ready)} live={output.open} onApply={applyCaptionScale} onCancel={()=>setDialog(null)} error={error}/>:dialog==='review'&&review?<>{review.comparable?<RevisionReview key={review.baseId+':'+review.candidateId} review={review} busy={busy} onBack={()=>{setReview(null);setDialog('scripts')}} onApprove={()=>activateVersion(review.candidateId,{expectedActive:review.baseId,reviewed:true})}/>:<><p>서로 다른 작품이므로 가사와 큐를 비교하지 않습니다.</p><p>{review.beforeRevision} → {review.afterRevision}</p><button onClick={()=>{setReview(null);setDialog('scripts')}}>버전 목록</button><button className="primary" disabled={busy} onClick={()=>activateVersion(review.candidateId,{expectedActive:review.baseId,reviewed:false})}>다른 작품 활성화</button></>}{error&&<div role="status" className="import-error">{error}</div>}</>:dialog==='jump'?<><p>현재 큐 {num(state.index)}에서 큐 {num(next)}로 직접 이동합니다. 중간 큐는 송출되지 않습니다.</p><OperatorCaption view={preview} variant="preview" scale={captionScale} font={captionFont} ratios={previewRatios} typography={previewStyle}/><p>{next===null?'선택된 큐 없음':frames[next].trigger}</p><button className="primary" disabled={disabled||next===null} onClick={()=>{setDialog(null);command('GO',next)}}>큐 {num(next)} 직접 송출</button><button onClick={()=>{setSelected(null);setDialog(null)}}>취소 · 순차 진행</button></>:dialog==='output'?<><p>운영자 화면을 제외한 확장 디스플레이를 선택하세요. 첫 송출 전 검정 화면으로 시작합니다. 연결 후 상단 화면 테스트로 실제 표시를 확인할 수 있습니다.</p>{screens.map(s=><label className={'display-option'+(s.operator?' unavailable':'')} key={s.id}><input type="radio" name="display" disabled={s.operator} checked={display===String(s.id)} onChange={()=>setDisplay(String(s.id))}/><div><b>{s.label} · {s.width} × {s.height}</b><div className="muted text-xs">위치 ({s.x}, {s.y}) · {s.operator?'운영자 화면 · 선택 불가':s.primary?'주 디스플레이':'외부 디스플레이'}</div></div></label>)}<button className="primary" disabled={busy||!screens.some(s=>String(s.id)===display&&!s.operator)} onClick={async()=>{const r=await run(()=>api.start(Number(display)));if(r){setHoldCursor(null);setSelected(null);setQuery('');setBrowseScene(null);setDialog(null);requestAnimationFrame(()=>jump(r.deck.frames[0]?.blockId))}}}>공연 시작 · 검정 대기</button></>:<><p>{api?'실제 대본은 Electron 로컬 저장소에만 보관됩니다.':'브라우저 연습 모드입니다. 파일은 이 브라우저의 IndexedDB에만 저장되며 외부 송출은 Electron 앱에서 실행하세요.'} 불러온 후 원하는 버전을 활성화하세요.</p>{snap.versions.map(v=><div className="version" key={v.id}><div><b>{v.title}</b><div className="muted">{v.revision} · {v.count} cues</div></div><div className="version-actions">{v.id!==snap.active&&<button disabled={busy} onClick={()=>inspectVersion(v.id)}>비교</button>}<button disabled={!libraryReady||busy||v.id===snap.active} onClick={()=>inspectVersion(v.id,true)}>{v.id===snap.active?'사용 중':'활성화'}</button></div></div>)}<input ref={fileInput} type="file" accept=".json,application/json" aria-label="공연 데이터 파일" hidden onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)run(()=>importBrowserDeck(file,latest.current))}}/><button className="primary" disabled={!libraryReady||busy} onClick={()=>api?run(()=>api.importDeck()):fileInput.current?.click()}>공연 데이터 JSON 불러오기</button>{error&&<div role="status" className="import-error">{error}</div>}</>}</div></div>}
 </main>
}
createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).get('mode')==='audience'?<Audience/>:<Operator/>);
