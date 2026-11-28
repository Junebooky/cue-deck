// Exact song metadata, not scene-first cue or text proximity.
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const code=s=>norm(s).match(/^m\s*0*(\d+)(?:\s*-\s*(\d+))?(?=[.\s]|$)/)?.slice(1).filter(Boolean).join('-')??null;
// Optional verbatim front-matter number list. It is a catalog, never a cue anchor.
// Use only an explicitly marked list with unambiguous act and number labels.
// Body metadata remains authoritative for actual navigation and display titles.
function catalogRows(deck,body){
 const front=Array.isArray(deck.frontMatter)?deck.frontMatter:[];
 const start=front.findIndex(b=>norm(b?.text)==='넘버 리스트');
 if(start<0)return body;
 let act=null;const list=[];
 for(const item of front.slice(start+1)){
  const text=String(item?.text??'').trim();
  if(!text)continue;
  const marker=text.match(/^([12])\s*막$/);
  if(marker){act=Number(marker[1]);continue}
  const id=code(text);
  if(!id){if(list.length)break;continue}
  if(act===null)return body;
  const label=text.split(/\s+\/\s+/)[0].trim();
  list.push({code:id,act,label});
 }
 const keys=list.map(n=>n.code),bodyKeys=body.map(n=>n.code);
 if(!keys.length||new Set(keys).size!==keys.length||bodyKeys.some(k=>!k)||new Set(bodyKeys).size!==bodyKeys.length)return body;
 const byCode=new Map(body.map(n=>[n.code,n]));
 if(body.some(n=>!keys.includes(n.code)||list.find(c=>c.code===n.code)?.act!==n.act))return body;
 if(keys.filter(k=>byCode.has(k)).join('|')!==bodyKeys.join('|'))return body;
 return list.map(n=>{
  const mapped=byCode.get(n.code);
  if(mapped)return {...mapped,catalogLabel:n.label};
  // No invented scene or playback index, even for instrumental entries.
  return {key:'catalog:'+n.act+':'+n.code,label:n.label,code:n.code,act:n.act,scene:'목차 · 본문 위치 미확정',first:null,last:null,count:0,blockId:null,catalogOnly:true};
 });
}
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
 return catalogRows(deck,result).map(n=>{const title=Object.hasOwn(deck.numberTitles??{},n.key)?deck.numberTitles[n.key]:null;if(!title)return n;const prefix=n.label.match(/^M\s*\d+(?:\s*-\s*\d+)?/i)?.[0]??'';return {...n,originalLabel:n.label,label:prefix?prefix+'. '+title:title,editedTitle:title}});
}
export function searchNumbers(numbers,query){
 const q=norm(query);if(!q)return numbers;
 const compact=s=>norm(s).replace(/\s+/g,'');
 const m=q.match(/^m?\s*0*(\d+)(?:\s*-\s*(\d+))?$/);
 if(m){const primary=String(Number(m[1]));return numbers.filter(n=>n.code&&(m[2]?n.code===primary+'-'+Number(m[2]):n.code.split('-')[0]===primary))}
 return numbers.filter(n=>compact(n.label).includes(compact(q))||compact(n.catalogLabel).includes(compact(q))||compact(n.originalLabel).includes(compact(q)));
}

export function validateNumberTitles(deck){
 const titles=deck.numberTitles;if(titles===undefined)return;
 if(!titles||typeof titles!=='object'||Array.isArray(titles))throw Error('넘버 제목 설정 오류');
 const keys=new Set(buildNumbers({...deck,numberTitles:{}}).map(n=>n.key));
 if(Object.entries(titles).some(([k,v])=>!keys.has(k)||typeof v!=='string'||!v.trim()||v.length>200||/[\r\n]/.test(v)))throw Error('넘버 제목 설정 오류');
}
export function editedHeading(deck,b){
 if(b.kind!=='heading'||!b.number)return null;
 const key=b.sceneId+':'+b.number;
 return Object.hasOwn(deck.numberTitles??{},key)?buildNumbers(deck).find(n=>n.key===key)?.label??null:null;
}
