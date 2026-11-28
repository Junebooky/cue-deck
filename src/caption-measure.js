import {presentCaption} from './caption-presentation.mjs';
import {captionFamily} from './caption-fonts.mjs';
import {captionTarget,MIN_SCALE} from './caption-scale.mjs';
import {styleForRender,authoredLines} from './caption-style.mjs';
import {autoWidths,equalWidths,readWidths} from './caption-widths.mjs';
// Use the same canonical audience canvas for all previews, so AUTO ratios do not
// drift with monitor pane size. Measure actual glyph advances with loaded fonts.
export function measureLayout(sourceView,font,scale,manual,typography){
 const view=presentCaption(sourceView);
 const style=styleForRender(font,scale,typography);
 const n=view.columns.length;
 if(n<2)return {ratios:equalWidths(Math.max(n,1)),risk:false,shrink:false};
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return {ratios:readWidths(manual,n)??equalWidths(n),risk:false,shrink:false};
 const family=captionFamily(font),target=captionTarget(1920,1080,n,style.scale)*style.relative/100,floor=captionTarget(1920,1080,n,MIN_SCALE);
 const demand=view.columns.map(c=>{
  ctx.font=style.weight+' '+target+'px '+family;
  const width=line=>ctx.measureText(line).width+Math.max(0,Array.from(line).length-1)*style.tracking*target;
  const lyric=Math.max(0,...c.lines.flatMap(line=>line.split(/\r?\n/)).map(width));
  ctx.font=style.weight+' '+target*.55+'px '+family;
  return Math.max(lyric,ctx.measureText(c.actor).width);
 });
 const available=1920*.92-(n-1)*target*.8;
 const ratios=readWidths(manual,n)??autoWidths(demand,available);
 const factor=Math.max(...demand.map((d,i)=>d/(available*ratios[i]/100)));
 return {ratios,shrink:factor>1.01,risk:factor*floor/target>1.01};
}

export function estimateSolo(view,style){
 const ctx=document.createElement('canvas').getContext('2d');if(!ctx)return {lines:authoredLines(view),risk:false,shrink:false};
 const source=view.columns[0].lines.flatMap(s=>s.split(/\r?\n/)),target=captionTarget(1920,1080,1,style.scale)*style.relative/100;
 const measure=px=>{ctx.font=style.weight+' '+px+'px '+captionFamily(style.font);const width=s=>ctx.measureText(s).width+Math.max(0,Array.from(s).length-1)*style.tracking*px;return source.reduce((sum,line)=>{let rows=1,part='';for(const word of line.split(/\s+/)){const candidate=part?part+' '+word:word;if(width(candidate)>1920*.92&&part){rows++;part=word}else part=candidate;if(width(part)>1920*.92){rows+=Math.max(0,Math.ceil(width(part)/(1920*.92))-1);part=''}}return sum+rows},0)};
 const original=measure(target),floor=Math.min(target,captionTarget(1920,1080,1,style.scale)*.85);
 const shrink=style.policy==='prefer-two'&&source.length<=2&&original>2&&measure(floor)<=2;
 const lines=shrink?2:original;
 return {lines,shrink,risk:lines>=3||lines*target*style.lineHeight>1080*(.86-2*Math.abs(style.yOffset)/100)};
}
