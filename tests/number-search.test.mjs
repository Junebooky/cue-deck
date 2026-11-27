import test from 'node:test';import assert from 'node:assert/strict';import {demo} from '../src/demo.mjs';import {buildNumbers,searchNumbers} from '../src/number-search.mjs';
test('single song legacy scene starts at lyric, never place or drama',()=>{const n=buildNumbers(demo);assert.deepEqual(n.map(x=>x.first),[2,6,8]);assert.equal(searchNumbers(n,'m02')[0].first,6);assert.equal(searchNumbers(n,'2')[0].first,6)});
test('multiple songs in one scene distinguish headers and exact tags, reprise and instrumental',()=>{
 const d=structuredClone(demo);d.scenes[0].numbers=['M05-1. 외로운 별','M05-2. 외로운 별 (리프라이즈)','M06. 기악'];
 d.blocks.splice(3,0,{id:'heading1',sceneId:'s1',kind:'heading',actor:'',text:'M05-1. 외로운 별 / A',number:d.scenes[0].numbers[0]});
 d.blocks.splice(5,0,{id:'heading2',sceneId:'s1',kind:'heading',actor:'',text:'M05-2. 외로운 별 (리프라이즈) / B',number:d.scenes[0].numbers[1]});
 const n=buildNumbers(d);assert.equal(searchNumbers(n,'M5-2')[0].first,3);assert.equal(searchNumbers(n,'외로운별').length,2);assert.equal(searchNumbers(n,'M05').length,2);assert.equal(searchNumbers(n,'리프라이즈')[0].first,3);assert.equal(searchNumbers(n,'M06')[0].first,null);
});

function catalogFixture(){
 const d=structuredClone(demo);
 d.scenes[0].numbers=['M05-1. 첫 노래','M05-2. 첫 노래 (리프라이즈)'];
 d.scenes[1].number='M06. 다음 곡';
 d.scenes[2].number='M14. 마지막 노래';
 d.blocks.splice(3,0,{id:'h1',sceneId:'s1',kind:'heading',actor:'',text:'M05-1. 첫 노래 / A',number:d.scenes[0].numbers[0]});
 d.blocks.splice(5,0,{id:'h2',sceneId:'s1',kind:'heading',actor:'',text:'M05-2. 첫 노래 (리프라이즈) / B',number:d.scenes[0].numbers[1]});
 d.frontMatter=['넘버 리스트','1막','M05-1. 첫 노래 / A','M05-2. 첫 노래 Rep / B','M06. 다음 곡','2막','M13. 연주 (Instrumental)','M14. 목차의 제목 / A'].map(text=>({text}));
 return d;
}
test('catalog retains explicit authored codes, split numbers and missing instrumental without assigning a cue',()=>{
 const n=buildNumbers(catalogFixture());
 assert.deepEqual(n.map(x=>x.code),['5-1','5-2','6','13','14']);
 assert.deepEqual(n.map(x=>x.first),[2,3,6,null,8]);
 assert.equal(searchNumbers(n,'M13')[0].catalogOnly,true);
 assert.equal(searchNumbers(n,'M13')[0].blockId,null);
 assert.equal(searchNumbers(n,'M14')[0].label,'M14. 마지막 노래');
 assert.equal(searchNumbers(n,'목차의 제목')[0].first,8);
 assert.equal(searchNumbers(n,'M05').length,2);
});
test('inconsistent catalog never renumbers or reorders body cues',()=>{
 const d=catalogFixture();
 [d.frontMatter[2],d.frontMatter[3]]=[d.frontMatter[3],d.frontMatter[2]];
 const n=buildNumbers(d);assert.deepEqual(n.map(x=>x.code),['5-1','5-2','6','14']);
 assert.deepEqual(n.map(x=>x.first),[2,3,6,8]);
});
test('catalog with a duplicate code or conflicting act cannot override body',()=>{
 const d=catalogFixture();d.frontMatter.push({text:'M14. 중복'});
 assert.equal(buildNumbers(d).length,4);
 const q=catalogFixture();q.frontMatter[5].text='1막';
 assert.equal(buildNumbers(q).length,4);
});
