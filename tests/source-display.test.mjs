import test from 'node:test';import assert from 'node:assert/strict';import {displaySource} from '../src/source-display.mjs';
test('exact tab-delimited speaker is displayed once without mutating source or lyric formatting',()=>{
 const b={kind:'lyric',actor:'합창',text:'합창\t첫 줄\n둘째 줄',runs:[{text:'합',bold:true},{text:'창\t첫 ',bold:true},{text:'줄\n둘째 줄',red:true}]};
 const original=structuredClone(b),display=displaySource(b);
 assert.equal(display.text,'첫 줄\n둘째 줄');assert.deepEqual(display.runs,[{text:'첫 ',bold:true},{text:'줄\n둘째 줄',red:true}]);assert.deepEqual(b,original);
});
test('remove repeated dialogue label only, retain genuine names and table cells',()=>{
 for(const [kind,actor,text,expected] of [['dialogue','A','A\t안녕','안녕'],['nar','NAR','NAR\t설명','설명'],['lyric','A','A 사랑해','A 사랑해'],['lyric','A','B\t노래','B\t노래'],['lyric','A','A\t','A\t'],['heading','A','A\t제목','A\t제목']])assert.equal(displaySource({kind,actor,text}).text,expected);
 const b={kind:'lyric',actor:'A',text:'A\t노래',sourceCells:['A','노래']};assert.equal(displaySource(b).text,b.text);
});
