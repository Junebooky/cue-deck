// Invented sample only: never treat this as the actual performance.
export const demo={schemaVersion:1,productionId:'demo',title:'Cue Deck · 테스트 공연',revision:'demo-1',scenes:[{id:'s1',act:1,label:'01 · 연습실',number:'M01'},{id:'s2',act:1,label:'02 · 정원',number:'M02'},{id:'s3',act:2,label:'03 · 극장',number:'M03'}],blocks:[
{id:'b1',sceneId:'s1',kind:'place',actor:'장소',text:'늦은 오후, 작은 연습실'},
{id:'b2',sceneId:'s1',kind:'nar',actor:'NAR',text:'두 배우가 조용히 악보를 펼친다.'},
{id:'b3',sceneId:'s1',kind:'dialogue',actor:'배우 A',text:'준비됐어? 이제 시작해 보자.'},
{id:'b4',sceneId:'s1',kind:'lyric',actor:'배우 A',text:'새로운 하루를 열어\n우리의 길을 찾아가'},
{id:'b5',sceneId:'s1',kind:'lyric',actor:'배우 A / 배우 B',text:'저 멀리 빛나는 길 (배우 B : 나도 함께)\n서로의 손을 잡고'},
{id:'b6',sceneId:'s1',kind:'direction',actor:'무대 지시',text:'(조명이 천천히 어두워진다.)'},
{id:'b7',sceneId:'s1',kind:'dialogue',actor:'배우 B',text:'오늘은 여기까지 하자.'},
{id:'b8',sceneId:'s2',kind:'place',actor:'장소',text:'다음 날, 정원'},
{id:'b9',sceneId:'s2',kind:'lyric',actor:'배우 B',text:'바람이 부는 아침\n다시 한 걸음'},
{id:'b10',sceneId:'s3',kind:'place',actor:'장소',text:'밤, 극장'},
{id:'b11',sceneId:'s3',kind:'lyric',actor:'함께',text:'함께 걷는 이 길\n끝까지 잊지 않으리'}],frames:[
{id:'c1',blockId:'b1',kind:'place',trigger:'장면 전환 확인 후',columns:[{actor:'',lines:['늦은 오후, 작은 연습실']}]},
{id:'c2',blockId:'b3',kind:'black',trigger:'일반 대사 시작',columns:[]},
{id:'c3',blockId:'b4',kind:'solo',trigger:'새로운 하루를 열어',columns:[{actor:'배우 A',lines:['새로운 하루를 열어','우리의 길을 찾아가']}]},
{id:'c4',blockId:'b5',kind:'overlap',trigger:'저 멀리 빛나는 길',columns:[{actor:'배우 A',lines:['저 멀리 빛나는 길','서로의 손을 잡고']},{actor:'배우 B',lines:['나도 함께','']}]},
{id:'c5',blockId:'b7',kind:'black',trigger:'오늘은 여기까지 하자',columns:[]},
{id:'c6',blockId:'b8',kind:'place',trigger:'정원 장면 전환',columns:[{actor:'',lines:['다음 날, 정원']}]},
{id:'c7',blockId:'b9',kind:'solo',trigger:'바람이 부는 아침',columns:[{actor:'배우 B',lines:['바람이 부는 아침','다시 한 걸음']}]},
{id:'c8',blockId:'b10',kind:'place',trigger:'2막 극장 장면 시작',columns:[{actor:'',lines:['밤, 극장']}]},
{id:'c9',blockId:'b11',kind:'solo',trigger:'함께 걷는 이 길',columns:[{actor:'함께',lines:['함께 걷는 이 길','끝까지 잊지 않으리']}]}]};
