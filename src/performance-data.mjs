import {readSettings} from './caption-style.mjs';
import {validWidths} from './caption-widths.mjs';
// One portable, self-contained show JSON. Legacy sidecars are read-only fallbacks.
export function readPerformance(deck){
 const v=deck?.performanceSettings;if(v===undefined)return null;
 if(!v||v.version!==1||!v.captionSettings||!v.captionWidths||typeof v.captionWidths!=='object'||Array.isArray(v.captionWidths)||Object.values(v.captionWidths).some(r=>!Array.isArray(r)||!validWidths(r,r.length)))throw Error('공연 JSON 자막 설정 오류');
 return {version:1,captionSettings:readSettings(v.captionSettings),captionWidths:structuredClone(v.captionWidths)};
}
export function withPerformance(deck,captionSettings,captionWidths){
 const next={...deck,performanceSettings:{version:1,captionSettings,captionWidths}};
 next.performanceSettings=readPerformance(next);return structuredClone(next);
}
