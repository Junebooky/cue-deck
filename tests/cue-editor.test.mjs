import test from 'node:test';
import assert from 'node:assert/strict';
import {demo} from '../src/demo.mjs';
import {editCueRevision,editableCueAnchors,readWorkingDeck,assertEditBase,editCount,applyShowEdit} from '../src/cue-editor.mjs';
import {searchBlocks} from '../src/operator-navigation.mjs';
import {compareRevisions} from '../src/revision-review.mjs';
import {recordShowChange} from '../src/show-history.mjs';
const patch=(d,id,extra={})=>{const f=d.frames.find(f=>f.id===id);return {frameId:id,sourceBlockIds:editableCueAnchors(d,id).own,columns:structuredClone(f.columns),trigger:f.trigger,...extra}};
test('text edit preserves revision, source and unrelated frames',()=>{
 const old=structuredClone(demo);
 const next=editCueRevision(old,patch(old,'c3',{columns:[{actor:'배우 A',lines:['수정된 가사','이어지는 말']}]}));
 assert.deepEqual(old,demo);assert.deepEqual(next.blocks,old.blocks);assert.deepEqual(next.scenes,old.scenes);
 assert.equal(next.frames[2].id,'c3');assert.equal(next.frames[2].operatorEdited,true);
 assert.equal(next.frames[2].columns[0].lines[0],'수정된 가사');assert.equal(next.revision,old.revision);assert.equal(editCount(next),1);
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
test('clearing all lyrics converts a solo or multi-card cue to black while preserving source range',()=>{
 const d=structuredClone(demo);
 d.blocks.splice(4,0,{...d.blocks[3],id:'second-line',text:'두 번째 줄'});
 d.frames[2].sourceBlockIds=['b4','second-line'];
 const black=editCueRevision(d,patch(d,'c3',{columns:[{actor:'배우 A',lines:['']}]}));
 assert.equal(black.frames[2].kind,'black');
 assert.deepEqual(black.frames[2].columns,[]);
 assert.deepEqual(black.frames[2].sourceBlockIds,['b4','second-line']);
 assert.deepEqual(readWorkingDeck(d,black),black);
 const updated=editCueRevision(black,patch(black,'c3',{trigger:'수정된 트리거'}));
 assert.equal(updated.frames[2].kind,'black');
 assert.equal(updated.frames[2].trigger,'수정된 트리거');
 assert.throws(()=>editCueRevision(black,patch(black,'c3',{sourceBlockIds:['b4','second-line','b5','b6']})));
});
test('reject oversized rows, blank actor in duet and no-op',()=>{
 for(const columns of [[{actor:'A',lines:Array(7).fill('a')}],[{actor:'A',lines:['a']},{actor:'',lines:['b']}]])assert.throws(()=>editCueRevision(demo,patch(demo,'c3',{columns})));
 assert.throws(()=>editCueRevision(demo,patch(demo,'c3')),/변경된 내용/);
});

test('repeated edits preserve the import identity and reject stale forms',()=>{
 const first=editCueRevision(demo,patch(demo,'c3',{columns:[{actor:'A',lines:['첫 수정']}]}));
 const second=editCueRevision(first,patch(first,'c4',{columns:[{actor:'B',lines:['다음 수정']}]}));
 assert.equal(second.revision,demo.revision);assert.equal(editCount(second),2);
 assert.equal(second.frames[2].columns[0].lines[0],'첫 수정');
 assert.deepEqual(readWorkingDeck(demo,second),second);
 assert.throws(()=>assertEditBase(second,{expectedEditCount:1}),/이미 수정/);
 assert.doesNotThrow(()=>assertEditBase(second,{expectedEditCount:2}));
 const tampered=structuredClone(second);tampered.blocks[0].text='원본 변조';
 assert.throws(()=>readWorkingDeck(demo,tampered),/원본과 일치/);
});

test('insert BLACK cue right after an existing single or multi-card cue while preserving order and anchors',()=>{
 const d=structuredClone(demo);
 d.blocks.splice(4,0,{...d.blocks[3],id:'second-line',text:'두 번째 줄'});
 d.frames[2].sourceBlockIds=['b4','second-line'];
 const next=applyShowEdit(d,{action:'add-cue',afterFrameId:'c3',blockId:'second-line',frameId:'operator-black-0001',kind:'black',trigger:'간주 블랙',columns:[],expectedEditCount:0});
 assert.equal(next.frames.length,demo.frames.length+1);
 assert.equal(next.frames[2].id,'c3');
 assert.equal(next.frames[3].id,'operator-black-0001');
 assert.equal(next.frames[3].kind,'black');
 assert.equal(next.frames[3].blockId,'second-line');
 assert.deepEqual(next.frames[3].columns,[]);
 assert.deepEqual(next.frames[4].id,'c4');
 const recorded=recordShowChange(d,next,'BLACK 추가');
 assert.deepEqual(readWorkingDeck(d,recorded),recorded);
 assert.deepEqual(editableCueAnchors(next,'c3').own,['b4','second-line']);
 assert.deepEqual(editableCueAnchors(next,'operator-black-0001').own,['second-line']);
 const edited=applyShowEdit(next,{frameId:'operator-black-0001',expectedEditCount:1,sourceBlockIds:['second-line'],trigger:'수정된 간주 블랙',columns:[]});
 assert.equal(edited.frames[3].trigger,'수정된 간주 블랙');
});
