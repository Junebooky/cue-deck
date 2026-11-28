import test from 'node:test';
import assert from 'node:assert/strict';
import {demo} from '../src/demo.mjs';
import {searchCueTargets} from '../src/search-cue-targets.mjs';
test('search lyric or place resolves its canonical frame, not the next screen',()=>{
 assert.deepEqual(searchCueTargets(demo,'b4','우리의 길'),[2]);
 assert.deepEqual(searchCueTargets(demo,'b5','나도 함께'),[3]);
 assert.deepEqual(searchCueTargets(demo,'b8','정원'),[5]);
});
test('a second source line uses the same explicitly reviewed slide',()=>{
 const d=structuredClone(demo);
 d.blocks[3].text='새로운 하루를 열어';
 d.blocks.splice(4,0,{...d.blocks[3],id:'second',text:'우리의 길을 찾아가'});
 d.frames[2].sourceBlockIds=['b4','second'];
 assert.deepEqual(searchCueTargets(d,'second','우리의 길'),[2]);
 delete d.frames[2].sourceBlockIds;
 assert.deepEqual(searchCueTargets(d,'second','우리의 길'),[2]);
 d.blocks[4].text='다른 가사';
 assert.deepEqual(searchCueTargets(d,'second','다른 가사'),[]);
});
test('a confirmed number heading resolves its first sung frame',()=>{
 const d=structuredClone(demo);
 d.blocks.splice(3,0,{id:'heading',sceneId:'s1',kind:'heading',actor:'',number:'M01',text:'M01. 테스트 넘버'});
 assert.deepEqual(searchCueTargets(d,'heading','M01'),[2]);
});
test('dialogue and unanchored lyrics never guess a future frame',()=>{
 assert.deepEqual(searchCueTargets(demo,'b2','악보'),[]);
 assert.deepEqual(searchCueTargets(demo,'b3','준비됐어'),[]);
 assert.deepEqual(searchCueTargets(demo,'missing','가사'),[]);
});
test('multiple slides anchored to one block require an exact unique lyric or explicit selection',()=>{
 const d=structuredClone(demo);
 d.frames.splice(3,0,{...d.frames[2],id:'alternate',columns:[{actor:'배우 A',lines:['별빛을 따라']}]});
 assert.deepEqual(searchCueTargets(d,'b4','별빛을 따라'),[3]);
 assert.deepEqual(searchCueTargets(d,'b4','배우 A'),[2,3]);
});
