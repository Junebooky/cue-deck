import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const profile=await mkdtemp(path.join(tmpdir(),'cue-deck-keyboard-'));
let app;
try{
 app=await electron.launch({args:['.', '--user-data-dir='+profile,...(process.platform==='linux'?['--no-sandbox']:[])],env:{...process.env,XDG_CONFIG_HOME:profile},timeout:60000});
 const page=await app.firstWindow();
 await page.getByRole('button',{name:'대본 관리'}).waitFor({state:'visible'});
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='대본 관리')?.disabled);
 const nativeKey=async(keyCode,modifiers=[])=>{
  await app.evaluate(({BrowserWindow},data)=>{
   const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('mode=operator'));
   if(!w)throw Error('operator window missing');
   w.focus();w.webContents.focus();
   w.webContents.sendInputEvent({type:'keyDown',keyCode:data.keyCode,modifiers:data.modifiers});
   w.webContents.sendInputEvent({type:'keyUp',keyCode:data.keyCode,modifiers:data.modifiers});
  },{keyCode,modifiers});
 };
 const captionCount=async(count)=>page.waitForFunction(n=>document.querySelectorAll('.program-frame .caption-cell').length===n,count);
 const markCount=async(n)=>page.waitForFunction(n=>document.querySelector('#block-b1 .error-mark')?.textContent.includes(n+'회'),n);
 await page.locator('.transport .go').click();await captionCount(1);
 await page.locator('.transport .go').focus();await nativeKey('B');await captionCount(0);
 await nativeKey('B',['control']);await captionCount(1);
 await page.getByRole('button',{name:'리허설 노트'}).click();
 await page.getByRole('button',{name:'새 리허설 시작'}).click();
 await page.locator('.transport .go').focus();await nativeKey('E');await markCount(1);
 const memo=page.getByRole('textbox',{name:'오류 메모'});
 await memo.waitFor({state:'visible'});assert.equal(await memo.evaluate(el=>el===document.activeElement),true);
 await memo.fill('송출 오류 테스트');await memo.press('Enter');
 await page.getByRole('dialog',{name:'오류 메모'}).waitFor({state:'hidden'});
 await nativeKey('E',['control']);await markCount(2);
 await memo.press('Escape');await page.getByRole('dialog',{name:'오류 메모'}).waitFor({state:'hidden'});
 await page.getByRole('textbox',{name:'대사 · 가사 검색'}).focus();
 await nativeKey('B',['control']);await nativeKey('E',['control']);
 // Synchronize after the input events before asserting that no command ran.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.locator('.program-frame .caption-cell').count(),1);
 assert.match(await page.locator('#block-b1 .error-mark').innerText(),/2회/);
 assert.match(await page.locator('.live-label').innerText(),/001 \/ 9/);
 // A single-display performance uses the operator PROGRAM, not a covering audience window.
 const count=await app.evaluate(({screen})=>screen.getAllDisplays().length);
 if(count===1){
  await page.getByRole('button',{name:'▶ 공연 시작'}).click();
  await page.getByRole('button',{name:'공연 시작 · 검정 대기'}).click();
  await page.getByLabel('공연 집중 모드').waitFor({state:'visible'});
  await page.getByText('● 단일 화면 · PROGRAM',{exact:true}).waitFor({state:'visible'});
  await captionCount(0);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);
  await page.locator('.transport .go').click();await captionCount(1);
  const live=await page.evaluate(()=>window.deckAPI.state());
  assert.equal(live.output.open,true);assert.equal(live.output.localOnly,true);assert.equal(live.output.ack,-1);
  await page.getByRole('button',{name:'대본 검색',exact:true}).click();
  await page.getByRole('textbox',{name:'대사 · 가사 검색'}).fill('우리의 길을 찾아가');
  await page.getByRole('button',{name:'검색 위치 슬라이드 시작'}).click();
  await page.getByRole('button',{name:'확인 · 슬라이드 시작'}).click();
  await captionCount(2);
  assert.equal((await page.evaluate(()=>window.deckAPI.state())).state.index,2);
  await page.locator('.transport .go').click();await captionCount(4);
  assert.equal((await page.evaluate(()=>window.deckAPI.state())).state.index,3);
  await nativeKey('Escape');
  await page.getByRole('button',{name:'공연 종료 · Enter'}).click();await captionCount(0);
  assert.equal((await page.evaluate(()=>window.deckAPI.state())).output.open,false);
 }
 console.log('Electron native input smoke test: B, Ctrl+B, E, Ctrl+E, editable guard passed');
}finally{await app?.close();await rm(profile,{recursive:true,force:true})}
