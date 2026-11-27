// Navigation is read-only: no playback commands or audience state here.
export const defaultPrefs={sceneOpen:true,sceneWidth:200,monitorWidth:390,fontSize:17,follow:true};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function cleanPrefs(p={}){
 const n=(x,d,min,max)=>typeof x==='number'&&Number.isFinite(x)?clamp(x,min,max):d;
 return {sceneOpen:p?.sceneOpen!==false,sceneWidth:n(p?.sceneWidth,200,150,340),monitorWidth:n(p?.monitorWidth,390,260,600),fontSize:n(p?.fontSize,17,13,28),follow:p?.follow!==false};
}
export function fitLayout(width,prefs){
 const p=cleanPrefs(prefs),available=Math.max(0,width),split=p.sceneOpen?20:10,centerMin=320;
 const left=p.sceneOpen?clamp(p.sceneWidth,150,Math.max(150,available-centerMin-260-split)):0;
 const right=clamp(p.monitorWidth,260,Math.max(260,available-left-centerMin-split));
 return {left,right};
}
export function buildNavigation(deck){
 const blockById=new Map(deck.blocks.map(b=>[b.id,b])), byBlock=new Map(), byScene=new Map(deck.scenes.map(s=>[s.id,{scene:s,blocks:[],cues:[],numbers:[]}]));
 for(const b of deck.blocks){const item=byScene.get(b.sceneId);if(item)item.blocks.push(b)}
 deck.frames.forEach((f,i)=>{const arr=byBlock.get(f.blockId)||[];arr.push(i);byBlock.set(f.blockId,arr);const item=byScene.get(blockById.get(f.blockId)?.sceneId);if(item)item.cues.push(i)});
 for(const item of byScene.values()){
   const names=Array.isArray(item.scene.numbers)?item.scene.numbers.filter(n=>typeof n==='string'&&n.trim()):[item.scene.number].filter(Boolean);
   item.numbers=names.map(label=>({label,blockId:(item.blocks.find(b=>b.kind==='heading'&&b.number===label)||item.blocks.find(b=>b.number===label)||item.blocks[0])?.id}));
 }
 return {blockById,byBlock,byScene};
}
const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g,' ').trim();
export function searchBlocks(blocks,query){
 const q=normalize(query);if(!q)return [];
 return blocks.filter(b=>[b.text,b.actor,b.number,...(b.sourceCells||[])].some(s=>normalize(s).includes(q))).map(b=>b.id);
}
export function cueTarget(index,selected,count){
 const sequential=index+1<count?index+1:null;
 const target=Number.isInteger(selected)&&selected>=0&&selected<count?selected:sequential;
 return {sequential,target,jump:target!==null&&target!==sequential};
}
export function stepMatch(i,delta,count){return count?((i+delta)%count+count)%count:-1}
