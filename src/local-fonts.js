import 'pretendard/dist/web/variable/pretendardvariable.css';
import '@fontsource/noto-sans-kr/600.css';
import '@fontsource/noto-serif-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-sans-kr/700.css';
import '@fontsource/noto-serif-kr/500.css';
import '@fontsource/noto-serif-kr/700.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import {fontFor,frameText} from './caption-fonts.mjs';
export const FONT_SAMPLE='가나다라마바사아자차카타파하 1939년 경성 ABC 0123456789';
export async function ensureCaptionFont(id,...views){return ensureStyledFont(id,600,...views)}
export async function ensureStyledFont(id,weight,...views){
 const text=FONT_SAMPLE+' '+views.map(frameText).join(' ');
 const families=new Set([fontFor(id).family,'Noto Sans KR']);
 await Promise.all([...families].map(async family=>{
  const loaded=await document.fonts.load(weight+' 24px "'+family+'"',text);
  if(!loaded.length||loaded.some(f=>f.status!=='loaded'))throw new Error('로컬 폰트 로드 실패: '+family);
 }));
}
