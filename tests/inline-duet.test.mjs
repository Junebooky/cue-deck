import test from 'node:test';import assert from 'node:assert/strict';import {buildCueGroups} from '../src/cue-groups.mjs';
const block=(id,left,right)=>({id,sceneId:'s',kind:'lyric',actor:'A',text:left+' ('+right+')',runs:[{text:left+' ',red:false},{text:'('+right+')',red:true}]});
test('legacy inline red chorus groups both exact rows of the audience duet',()=>{
 const blocks=[block('a','첫 가사','코러스 : 함께'),block('b','둘째 가사','다 같이'),block('c','다음','다음')];
 const f={id:'f',blockId:'a',kind:'overlap',columns:[{actor:'A',lines:['첫 가사','둘째 가사']},{actor:'코러스',lines:['함께','다 같이']}]};
 const deck={blocks,frames:[f,{id:'g',blockId:'c',kind:'solo',columns:[{actor:'A',lines:['다음']}]}]};
 assert.deepEqual(buildCueGroups(deck).ranges.get(0),['a','b']);
 blocks[1].runs[1].red=false;assert.deepEqual(buildCueGroups(deck).ranges.get(0),['a']);
});
