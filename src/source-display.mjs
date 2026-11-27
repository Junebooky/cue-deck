// The operator header already shows actor. Hide only an exact, tab-delimited
// duplicate actor field in a plain source paragraph, preserving the stored source.
const canon=s=>String(s??'').normalize('NFC').replace(/\s+/gu,'');
export function actorPrefixLength(block){
 if(!['lyric','dialogue','nar'].includes(block.kind)||block.sourceCells||!canon(block.actor))return 0;
 const text=block.text,tab=text.indexOf('\t');
 if(tab<0||canon(text.slice(0,tab))!==canon(block.actor))return 0;
 // Do not remove the entire paragraph, or real speech containing the actor's name.
 const length=tab+1+(text.slice(tab+1).match(/^[ \t]*/)?.[0].length??0);
 return text.slice(length).trim()?length:0;
}
export function displaySource(block){
 const length=actorPrefixLength(block);
 if(!length)return {text:block.text,runs:block.runs};
 const text=block.text.slice(length);
 let remaining=length;
 const runs=Array.isArray(block.runs)?block.runs.flatMap(run=>{
  if(remaining>=run.text.length){remaining-=run.text.length;return []}
  const value={...run,text:run.text.slice(remaining)};remaining=0;return [value];
 }):undefined;
 return {text,runs};
}
