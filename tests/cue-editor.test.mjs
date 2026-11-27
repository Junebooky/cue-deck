import test from 'node:test';
import assert from 'node:assert/strict';
import {demo} from '../src/demo.mjs';
import {editCueRevision,editableCueAnchors} from '../src/cue-editor.mjs';
import {searchBlocks} from '../src/operator-navigation.mjs';
import {compareRevisions} from '../src/revision-review.mjs';
const patch=(d,id,extra={})=>{const f=d.frames.find(f=>f.id===id);return {frameId:id,sourceBlockIds:editableCueAnchors(d,id).own,columns:structuredClone(f.columns),trigger:f.trigger,...extra}};
test('text edit is a new revision, source and unrelated frames remain identical',()=>{
 const old=structuredClone(demo);
 const next=editCueRevision(old,patch(old,'c3',{columns:[{actor:'배우 A',lines:['수정된 가사','이어지는 말']}]}));
 assert.deepEqual(old,demo);assert.deepEqual(next.blocks,old.blocks);assert.deepEqual(next.scenes,old.scenes);
 assert.equal(next.frames[2].id,'c3');assert.equal(next.frames[2].operatorEdited,true);
 assert.equal(next.frames[2].columns[0].lines[0],'수정된 가사');assert.notEqual(next.revision,old.revision);
 assert.deepEqual(next.frames.filter(f=>f.id!=='c3'),old.frames.filter(f=>f.id!=='c3'));
 assert.deepEqual(searchBlocks(next.blocks,'수정된 가사',next.frames),['b4']);
 assert.equal(compareRevisions(old,next).counts.cue.changed,1);
});
test('remove one vocal lane and empty rows, retain other singer at full width',()=>{
 const next=editCueRevision(demo,patch(demo,'c4',{columns:[{actor:'배우 A',lines:['가사','']},{actor:'배우 B',lines:['','']}]}));
 assert.equal(next.frames[3].kind,'solo');assert.deepEqual(next.frames[3].columns,[{actor:'배우 A',lines:['가사']}]);
});
test('pad empty duet cells without moving lyrics to another row',()=>{
 const next=editCueRevision(demo,patch(demo,'c4',{columns:[{actor:'배우 A',lines:['가사','둘째']},{actor:'배우 B',lines:['함께']}]}));
 assert.equal(next.frames[3].kind,'overlap');assert.deepEqual(next.frames[3].columns[1].lines,['함께','']);
});
test('relocate to unused same-number lyric and re-sort by source order',()=>{
 const d=structuredClone(demo);
 d.blocks.splice(5,0,{id:'free',sceneId:'s1',kind:'lyric',actor:'배우 A',text:'다른 타이밍'});
 const next=editCueRevision(d,patch(d,'c3',{sourceBlockIds:['free'],trigger:'다른 타이밍'}));
 assert.equal(next.frames[3].id,'c3');assert.equal(next.frames[3].blockId,'free');
 assert.equal(next.frames[2].id,'c4');assert.deepEqual(next.blocks,d.blocks);
});
test('reject occupied, different-scene, noncontiguous and incorrect-kind source anchors',()=>{
 for(const ids of [['b5'],['b9'],['b4','b6'],['b2']])assert.throws(()=>editCueRevision(demo,patch(demo,'c3',{sourceBlockIds:ids})));
});
test('black cue may be moved to a free source but never becomes a lyric',()=>{
 const next=editCueRevision(demo,patch(demo,'c2',{sourceBlockIds:['b2'],trigger:'NAR 시작',columns:[{actor:'A',lines:['no']}]}));
 assert.equal(next.frames[1].kind,'black');assert.deepEqual(next.frames[1].columns,[]);
});
test('reject empty caption, oversized rows, blank actor in duet and no-op',()=>{
 for(const columns of [[{actor:'A',lines:['']}],[{actor:'A',lines:Array(7).fill('a')}],[{actor:'A',lines:['a']},{actor:'',lines:['b']}]])assert.throws(()=>editCueRevision(demo,patch(demo,'c3',{columns})));
 assert.throws(()=>editCueRevision(demo,patch(demo,'c3')),/변경된 내용/);
});
