import {captionFamily} from './caption-fonts.mjs';
import {captionTarget,MIN_SCALE} from './caption-scale.mjs';
import {autoWidths,equalWidths,readWidths} from './caption-widths.mjs';
// Use the same canonical audience canvas for all previews, so AUTO ratios do not
// drift with monitor pane size. Measure actual glyph advances with loaded fonts.
export function measureLayout(view,font,scale,manual){
 const n=view.columns.length;
 if(n<2)return {ratios:equalWidths(Math.max(n,1)),risk:false,shrink:false};
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return {ratios:readWidths(manual,n)??equalWidths(n),risk:false,shrink:false};
 const family=captionFamily(font),target=captionTarget(1920,1080,n,scale),floor=captionTarget(1920,1080,n,MIN_SCALE);
 const demand=view.columns.map(c=>{
  ctx.font='600 '+target+'px '+family;
  const lyric=Math.max(0,...c.lines.flatMap(line=>line.split(/\r?\n/)).map(line=>ctx.measureText(line).width));
  ctx.font='600 '+target*.55+'px '+family;
  return Math.max(lyric,ctx.measureText(c.actor).width);
 });
 const available=1920*.92-(n-1)*target*.8;
 const ratios=readWidths(manual,n)??autoWidths(demand,available);
 const factor=Math.max(...demand.map((d,i)=>d/(available*ratios[i]/100)));
 return {ratios,shrink:factor>1.01,risk:factor*floor/target>1.01};
}
