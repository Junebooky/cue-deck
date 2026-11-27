export const DEFAULT_FONT='pretendard';
export const CAPTION_FONTS=Object.freeze([
 {id:'pretendard',name:'Pretendard',family:'Pretendard Variable',description:'기본 · 균형 잡힌 현대 고딕'},
 {id:'noto-sans',name:'Noto Sans KR',family:'Noto Sans KR',description:'정돈된 고딕 · 공연장 추천'},
 {id:'ibm-plex',name:'IBM Plex Sans KR',family:'IBM Plex Sans KR',description:'선명하고 단정한 고딕'},
 {id:'noto-serif',name:'Noto Serif KR',family:'Noto Serif KR',description:'클래식 명조 · 시대극 분위기'}
].map(Object.freeze));
export function validFont(id){return CAPTION_FONTS.some(f=>f.id===id)}
export function readFont(id){return validFont(id)?id:DEFAULT_FONT}
export function fontFor(id){return CAPTION_FONTS.find(f=>f.id===readFont(id))}
export function captionFamily(id){return '"'+fontFor(id).family+'", "Noto Sans KR", sans-serif'}
export function frameText(view){return (view?.columns??[]).flatMap(c=>[c.actor,...c.lines]).join(' ')}
