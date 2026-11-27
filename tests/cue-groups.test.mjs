import test from 'node:test';import assert from 'node:assert/strict';import {demo} from '../src/demo.mjs';import {validatePackage} from '../src/model.mjs';import {buildCueGroups} from '../src/cue-groups.mjs';
function fixture(){const d=structuredClone(demo);d.blocks.splice(4,0,{...d.blocks[3],id:'second-line',text:'두 번째 줄'});d.frames[2].sourceBlockIds=[d.frames[2].blockId,'second-line'];return d}
test('explicit group preserves all source cards and single cue ownership',()=>{const d=validatePackage(fixture());const g=buildCueGroups(d);assert.equal(g.units.flatMap(u=>u.blocks).length,d.blocks.length);assert.deepEqual(g.units.find(u=>u.index===2).blocks.map(b=>b.id),[d.frames[2].blockId,'second-line']);assert.equal(buildCueGroups(demo).legacy,demo.frames.length)});
test('rejects unknown, reordered, noncontiguous and non-lyric ranges',()=>{for(const ids of [['wrong'],['second-line','b4'],['b4','b5'],['b4','second-line','b5']]){const d=fixture();d.frames[2].sourceBlockIds=ids;assert.throws(()=>validatePackage(d))}const d=fixture();d.blocks[4].kind='dialogue';assert.throws(()=>validatePackage(d))});

test('legacy frame with embedded newline matches both original cards, not the following cue',()=>{
 const d=structuredClone(demo);
 d.blocks[3].text='배우 A\t새로운 하루를 열어';
 d.blocks.splice(4,0,{...d.blocks[3],id:'legacy-second',text:'우리의 길을 찾아가'});
 d.frames[2].columns[0].lines=['새로운 하루를 열어\n우리의 길을 찾아가'];
 const g=buildCueGroups(validatePackage(d));
 assert.deepEqual(g.ranges.get(2),['b4','legacy-second']);assert.equal(g.units.find(u=>u.index===2).blocks.length,2);
 assert.equal(g.units.flatMap(u=>u.blocks).length,d.blocks.length);
});
test('legacy mismatched text and drama cannot be guessed into a group',()=>{
 const d=structuredClone(demo);d.blocks[3].text='새로운 하루를 열어';d.blocks.splice(4,0,{...d.blocks[3],id:'legacy-second',kind:'dialogue',text:'우리의 길을 찾아가'});
 const g=buildCueGroups(validatePackage(d));assert.deepEqual(g.ranges.get(2),['b4']);assert.ok(g.unresolved>0);assert.equal(g.units.some(u=>u.index===2),false);
});
test('legacy overlap matches aligned original table columns including blank lane',()=>{
 const d=structuredClone(demo);d.blocks[4].text='저 멀리 빛나는 길\t나도 함께';d.blocks[4].sourceCells=['저 멀리 빛나는 길','나도 함께'];
 d.blocks.splice(5,0,{...d.blocks[4],id:'overlap-second',text:'서로의 손을 잡고\t',sourceCells:['서로의 손을 잡고','']});
 assert.deepEqual(buildCueGroups(validatePackage(d)).ranges.get(3),['b5','overlap-second']);
});
