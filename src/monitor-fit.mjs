// Scale consistently with the 16:9 canvas; a modest readability uplift over the audience's 4.6% / 3.5%.
export function monitorFontBounds(width,height,columns,variant){
 const widthFactor=columns>1?.043:.057;
 return {min:6,max:Math.max(6,Math.floor(Math.min(width*widthFactor,height*.105)*2)/2)};
}
export function fitMonitorFont({min,max},fits){
 // Search at half-pixel steps. Do not leave the size at the last failed probe.
 let low=Math.ceil(min*2),high=Math.max(low,Math.floor(max*2)),best=low;
 while(low<=high){const mid=Math.floor((low+high)/2);if(fits(mid/2)){best=mid;low=mid+1}else high=mid-1}
 return best/2;
}
