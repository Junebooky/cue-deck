// Coordinates are Electron DIP bounds, including negative coordinates on left/top displays.
export function describeDisplays(displays,operatorId,primaryId){
 return displays.map((d,i)=>({id:d.id,label:d.label||('Display '+(i+1)),primary:d.id===primaryId,operator:d.id===operatorId,width:d.bounds.width,height:d.bounds.height,x:d.bounds.x,y:d.bounds.y,scaleFactor:d.scaleFactor??1}));
}
export function selectOutputDisplay(displays,id,operatorId){
 const d=displays.find(d=>d.id===id);
 if(!d||(id===operatorId&&displays.length!==1))throw new Error('운영자 화면과 다른 확장 디스플레이를 선택하세요');
 return d;
}
export function coversDisplay(windowBounds,targetBounds){
 const a=windowBounds,b=targetBounds;
 const width=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
 const height=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
 return b.width>0&&b.height>0&&width*height/(b.width*b.height)>=.95;
}
export function testView(display){
 return {kind:'test',columns:[{actor:'',lines:['CUE DECK · OUTPUT TEST',display.label+' · '+display.width+' × '+display.height,'이 화면이 보이면 연결을 확인하세요']}]};
}
