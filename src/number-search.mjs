// Exact song metadata, not scene-first cue or text proximity.
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const code=s=>norm(s).match(/^m\s*0*(\d+)(?:\s*-\s*(\d+))?(?=[.\s]|$)/)?.slice(1).filter(Boolean).join('-')??null;
export function buildNumbers(deck){
 const positions=new Map(deck.blocks.map((b,i)=>[b.id,i]));
 const result=[];
 for(const scene of deck.scenes){
  const blocks=deck.blocks.filter(b=>b.sceneId===scene.id);
  const labels=Array.isArray(scene.numbers)?scene.numbers.filter(n=>typeof n==='string'&&n.trim()):[scene.number].filter(Boolean);
  const unique=[...new Set(labels)];
  const songs=unique.map(label=>{
   const heading=blocks.find(b=>b.kind==='heading'&&norm(b.number)===norm(label)&&code(b.text)===code(label)&&code(label));
   return {label,heading,start:heading?positions.get(heading.id):null};
  });
  for(const song of songs){
   const {label,heading,start}=song;
   const later=songs.map(x=>x.start).filter(x=>x!==null&&start!==null&&x>start);
   const end=later.length?Math.min(...later):Infinity;
   const cues=deck.frames.flatMap((frame,index)=>{
    if(!['solo','overlap'].includes(frame.kind))return [];
    const pos=positions.get(frame.blockId),b=deck.blocks[pos];
    if(!b||b.sceneId!==scene.id)return [];
    // Explicit song labels on lyrics are authoritative. For older decks with
    // no lyric labels, only use a confirmed heading or a single declared song.
    const matches=norm(b.number)===norm(label) || (!norm(b.number)&&(start!==null?pos>=start&&pos<end:unique.length===1));
    return matches&&(start===null||pos>=start&&pos<end)?[index]:[];
   });
   const first=cues[0]??null;
   result.push({key:scene.id+':'+label,label,code:code(label),act:scene.act,scene:scene.label,first,last:cues.at(-1)??null,count:cues.length,blockId:first===null?heading?.id:null});
  }
 }
 return result;
}
export function searchNumbers(numbers,query){
 const q=norm(query);if(!q)return numbers;
 const compact=s=>norm(s).replace(/\s+/g,'');
 const m=q.match(/^m?\s*0*(\d+)(?:\s*-\s*(\d+))?$/);
 if(m){const primary=String(Number(m[1]));return numbers.filter(n=>n.code&&(m[2]?n.code===primary+'-'+Number(m[2]):n.code.split('-')[0]===primary))}
 return numbers.filter(n=>compact(n.label).includes(compact(q)));
}
