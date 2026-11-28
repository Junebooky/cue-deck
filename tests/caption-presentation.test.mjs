import test from 'node:test';
import assert from 'node:assert/strict';
import {presentCaption} from '../src/caption-presentation.mjs';
const cue=(left,right)=>({id:'f',kind:'overlap',columns:[{actor:'범두',lines:left},{actor:'지수',lines:right}]});
test('left-only lyrics use a full-width solo presentation without changing source',()=>{
 const original=cue(['존경하는 그대여,','숨이 차 죽을 것만 같소만'],['',' ']);
 const before=structuredClone(original),view=presentCaption(original);
 assert.equal(view.kind,'solo');assert.deepEqual(view.columns,[original.columns[0]]);
 assert.deepEqual(original,before);
});
test('right-only lyrics use the same solo presentation',()=>{
 const original=cue(['',''],['아름다운 순간','']);
 assert.equal(presentCaption(original).kind,'solo');
 assert.deepEqual(presentCaption(original).columns,[original.columns[1]]);
});
test('real duet with an empty cell retains both columns and row alignment',()=>{
 const original=cue(['첫 가사','둘째 가사'],['함께','']);
 assert.equal(presentCaption(original),original);
});
test('black, location, solo and three singers are not rewritten',()=>{
 for(const view of [{kind:'black',columns:[]},{kind:'place',columns:[{actor:'',lines:['경성']}]},{kind:'solo',columns:[{actor:'A',lines:['가사']}]},{...cue(['A'],['B']),columns:[{actor:'A',lines:['A']},{actor:'B',lines:['B']},{actor:'C',lines:['C']}]}])assert.equal(presentCaption(view),view);
});
