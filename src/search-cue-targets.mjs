import {buildCueGroups} from './cue-groups.mjs';
import {buildNumbers} from './number-search.mjs';
const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/gu,'').trim();
// Only resolve reviewed source membership or the existing exact legacy grouping.
// Never jump to a nearby lyric merely because an unanchored source block matched.
export function searchCueTargets(deck,blockId,query,groups=buildCueGroups(deck)){
 const block=deck.blocks.find(b=>b.id===blockId);
 if(!block)return [];
 if(block.kind==='heading'&&block.number){
  const targets=buildNumbers(deck).filter(n=>n.key===block.sceneId+':'+block.number&&n.first!==null).map(n=>n.first);
  if(targets.length)return [...new Set(targets)];
 }
 if(!['lyric','place','heading'].includes(block.kind))return [];
 const candidates=deck.frames.flatMap((f,i)=>f.blockId===blockId||groups.ranges.get(i)?.includes(blockId)?[i]:[]);
 if(candidates.length<=1)return candidates;
 const q=normalize(query);
 const exact=q?candidates.filter(i=>deck.frames[i].columns.some(c=>c.lines.some(line=>normalize(line).includes(q)))):[];
 // Multiple candidates are offered explicitly if the query does not disambiguate.
 return exact.length?exact:candidates;
}
