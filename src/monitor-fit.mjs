// All lyric cells share a font size. The short-line ceiling is deliberately larger
// than the audience's proportional typography; this is a reading aid only.
export function monitorFontBounds(width,height,columns,variant){
 const program=variant==='program';
 const widthFactor=columns>1?(program?.071:.065):(program?.093:.084);
 return {min:6,max:Math.max(6,Math.floor(Math.min(program?38:34,width*widthFactor,height*.19)*2)/2)};
}
export function fitMonitorFont({min,max},fits){
 // Search at half-pixel steps. Do not leave the size at the last failed probe.
 let low=Math.ceil(min*2),high=Math.max(low,Math.floor(max*2)),best=low;
 while(low<=high){const mid=Math.floor((low+high)/2);if(fits(mid/2)){best=mid;low=mid+1}else high=mid-1}
 return best/2;
}
