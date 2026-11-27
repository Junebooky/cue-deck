import test from 'node:test';import assert from 'node:assert/strict';import {demo} from '../src/demo.mjs';import {buildNumbers,searchNumbers} from '../src/number-search.mjs';
test('single song legacy scene starts at lyric, never place or drama',()=>{const n=buildNumbers(demo);assert.deepEqual(n.map(x=>x.first),[2,6,8]);assert.equal(searchNumbers(n,'m02')[0].first,6);assert.equal(searchNumbers(n,'2')[0].first,6)});
test('multiple songs in one scene distinguish headers and exact tags, reprise and instrumental',()=>{
 const d=structuredClone(demo);d.scenes[0].numbers=['M05-1. 외로운 별','M05-2. 외로운 별 (리프라이즈)','M06. 기악'];
 d.blocks.splice(3,0,{id:'heading1',sceneId:'s1',kind:'heading',actor:'',text:'M05-1. 외로운 별 / A',number:d.scenes[0].numbers[0]});
 d.blocks.splice(5,0,{id:'heading2',sceneId:'s1',kind:'heading',actor:'',text:'M05-2. 외로운 별 (리프라이즈) / B',number:d.scenes[0].numbers[1]});
 const n=buildNumbers(d);assert.equal(searchNumbers(n,'M5-2')[0].first,3);assert.equal(searchNumbers(n,'외로운별').length,2);assert.equal(searchNumbers(n,'M05').length,2);assert.equal(searchNumbers(n,'리프라이즈')[0].first,3);assert.equal(searchNumbers(n,'M06')[0].first,null);
});
