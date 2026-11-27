export const MIN_SCALE=90,MAX_SCALE=120,DEFAULT_SCALE=100,SCALE_STEP=5;
export function validScale(value){return Number.isInteger(value)&&value>=MIN_SCALE&&value<=MAX_SCALE&&value%SCALE_STEP===0}
export function readScale(value){return validScale(value)?value:DEFAULT_SCALE}
export function captionTarget(width,height,columns,scale=DEFAULT_SCALE,monitor=false){
 const factor=columns>1?(monitor?.043:.035):(monitor?.057:.046);
 const limit=monitor?.105:.12;
 return Math.min(width*factor,height*limit)*readScale(scale)/100;
}
// Fit in half-pixel steps, respecting the requested ceiling. For unusually dense
// frames we may go below the user-controlled minimum, never intentionally crop.
export function fitCaption(target,fits){
 let lo=1,hi=Math.max(1,Math.floor(target*2)),best=0;
 while(lo<=hi){const mid=Math.floor((lo+hi)/2);if(fits(mid/2)){best=mid;lo=mid+1}else hi=mid-1}
 return {size:Math.max(.5,best/2),fits:best>0};
}
export function advanceStyleSequence(state){return {...state,sequence:state.sequence+1}}
