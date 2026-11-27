import {test,expect} from '@playwright/test';
const go=(p)=>p.locator('.transport .go');
test('navigation and search preserve full script and never send a cue',async({page})=>{
 await page.goto('/');await expect(page.locator('.block')).toHaveCount(11);
 await page.getByRole('button',{name:/02 · 정원/}).click();
 await expect(page.locator('.monitor-label.live-label')).toContainText('— / 9');
 await page.getByRole('textbox',{name:'대사 · 가사 검색'}).fill('악보');
 await expect(page.locator('.active-hit')).toContainText('악보');
 await expect(page.locator('.block')).toHaveCount(11);
 await page.getByRole('button',{name:'검색 지우기'}).click();
 await expect(page.locator('.monitor-label.live-label')).toContainText('— / 9');
 await go(page).click();await expect(page.locator('.monitor-label.live-label')).toContainText('001 / 9');
 await page.keyboard.press('Space');await expect(page.locator('.monitor-label.live-label')).toContainText('002 / 9');
 await expect(page.locator('.monitors .monitor-caption').first()).not.toContainText('준비됐어');
});
test('nonsequential cue is preview-only until explicit confirmation',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'큐 004 미리보기'}).click();
 await expect(page.locator('.preview-label')).toContainText('JUMP PREVIEW');
 await go(page).click();await expect(page.getByRole('dialog')).toContainText('비순차 송출 확인');
 await expect(page.locator('.live-label')).toContainText('— / 9');
 await page.getByRole('button',{name:'큐 004 직접 송출'}).click();await expect(page.locator('.live-label')).toContainText('004 / 9');
 await expect(page.locator('.monitors .monitor-caption').first().locator('.caption-cell')).toHaveCount(4);
 await page.getByRole('button',{name:'■ BLACK',exact:true}).click();
 await expect(page.locator('.monitors .monitor-caption').first().locator('.caption-cell')).toHaveCount(0);
 await page.getByRole('button',{name:'■ RESTORE',exact:true}).click();
 await expect(page.locator('.monitors .monitor-caption').first().locator('.caption-cell')).toHaveCount(4);
});
test('panel resizing, follow and reader size persist across reload',async({page})=>{
 await page.goto('/');const splitter=page.getByRole('separator',{name:'장면 패널 너비'});await splitter.focus();await page.keyboard.press('ArrowRight');await expect(splitter).toHaveAttribute('aria-valuenow','212');
 await page.getByRole('button',{name:'FOLLOW ON'}).click();await page.getByRole('button',{name:'대본 글자 크게'}).click();
 await page.reload();await expect(page.getByRole('button',{name:'FOLLOW OFF'})).toBeVisible();await expect(page.locator('.script-scroll')).toHaveCSS('font-size','18px');await expect(splitter).toHaveAttribute('aria-valuenow','212');
});

test('browser rehearsal imports, activates and restores a local JSON revision',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const imported={...demo,productionId:'fixture-local',title:'로컬 대본 테스트',revision:'test-import'};
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();
 const importButton=page.getByRole('button',{name:'공연 데이터 JSON 불러오기'});await expect(importButton).toBeEnabled();
 await page.getByLabel('공연 데이터 파일').setInputFiles({name:'local.cuedeck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 const version=page.locator('.version').filter({hasText:'로컬 대본 테스트'});await expect(version).toBeVisible();await version.getByRole('button',{name:'활성화'}).click();
 await expect(version.getByRole('button',{name:'사용 중'})).toBeDisabled();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(page.locator('.brand')).toContainText('로컬 대본 테스트');await page.reload();await expect(page.locator('.brand')).toContainText('로컬 대본 테스트');await expect(page.locator('.live-label')).toContainText('— / 9');
});
test('invalid JSON import leaves active revision intact',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();
 await page.getByLabel('공연 데이터 파일').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":1}')});
 await expect(page.locator('.import-error')).toContainText('잘못된 공연 데이터 형식');await expect(page.locator('.version')).toHaveCount(1);
});
test('cue kind remains visible when next or live, and program lamp animates only in operator view',async({page})=>{
 await page.goto('/');await expect(page.locator('.program-lamp')).toHaveCSS('animation-name','program-pulse');await expect(page.getByRole('button',{name:'큐 001 미리보기'})).toContainText('PLACE');await expect(page.getByRole('button',{name:'큐 001 미리보기'})).toContainText('NEXT');
 await go(page).click();await expect(page.getByRole('button',{name:'큐 002 미리보기'})).toContainText('BLACK');await expect(page.getByRole('button',{name:'큐 002 미리보기'})).toContainText('NEXT');await expect(page.locator('.block.dialogue .block-kind').first()).toHaveText('드라마');
 await page.goto('/?mode=audience');await expect(page.locator('.program-lamp')).toHaveCount(0);
});

test('same production update requires review and keeps old version until confirmed',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const revised=structuredClone(demo);revised.title='수정된 연습 대본';revised.revision='demo-2';revised.blocks[3].text='변경된 가사';revised.frames[2].columns[0].lines[0]='변경된 가사';revised.frames[2].trigger='변경된 가사';
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'new.cuedeck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(revised))});
 const version=page.locator('.version').filter({hasText:'수정된 연습 대본'});await version.getByRole('button',{name:'활성화'}).click();await expect(page.getByRole('dialog')).toContainText('SCRIPT REVISION REVIEW');await expect(page.locator('.review-list')).toContainText('변경된 가사');await expect(page.getByRole('button',{name:'검토 후 활성화'})).toBeDisabled();await expect(page.locator('.brand')).not.toContainText('수정된 연습 대본');
 await page.getByRole('checkbox',{name:'변경 사항 및 원본 연결을 검토했습니다.'}).check();await page.getByRole('button',{name:'검토 후 활성화'}).click();await expect(page.locator('.brand')).toContainText('수정된 연습 대본');await expect(page.locator('.version').filter({hasText:'수정된 연습 대본'}).getByRole('button',{name:'사용 중'})).toBeDisabled();
});

test('operator captions are readable, independently colored, and source cards have live/next beams',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();
 await go(page).click();const program=page.locator('.program-frame'),preview=page.locator('.preview-frame');
 await expect(program).toHaveCSS('border-top-color','rgb(219, 155, 155)');await expect(preview).toHaveCSS('border-top-color','rgb(170, 195, 246)');
 await expect.poll(()=>program.locator('.caption-grid').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(15);
 await expect(page.locator('.block.live')).toHaveCount(1);await expect(page.locator('.block.next')).toHaveCount(1);
 const live=page.locator('.block.live'),next=page.locator('.block.next');
 expect(await live.evaluate(e=>getComputedStyle(e,'::before').animationName)).toBe('cue-border-beam');
 expect(await next.evaluate(e=>getComputedStyle(e,'::before').animationDuration)).toBe('6.8s');
 expect(parseFloat(await live.evaluate(e=>getComputedStyle(e).paddingTop))).toBeGreaterThan(parseFloat(await next.evaluate(e=>getComputedStyle(e).paddingTop)));
 await go(page).click();await expect(program.locator('.caption-cell')).toHaveCount(0);await go(page).click();await expect(program.locator('.caption-cell')).toHaveCount(2);
 await expect(preview.locator('.caption-cell')).toHaveCount(4);
 await expect.poll(()=>preview.locator('.caption-grid').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(11);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.block.live').evaluate(e=>getComputedStyle(e,'::before').animationName)).toBe('none');
 await page.goto('/?mode=audience');await expect(page.locator('.audience-caption')).toBeVisible();await expect(page.locator('.operator-caption')).toHaveCount(0);
});
test('long operator lines fit after narrowing the monitor, all overlap rows share size',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='fit-fixture';d.title='긴 가사 검증';d.frames[3].columns[0].lines=['아주 긴 가사를 읽어야 하는 상황에서도 모든 문장이 화면 안에 정확히 들어와야 합니다 '.repeat(2),'한 줄 더'];d.frames[3].columns[1].lines=['동시에 노래하는 배우의 긴 가사도 같은 크기로 표시합니다 '.repeat(2),''];
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'fit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'긴 가사 검증'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('긴 가사 검증');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'큐 004 미리보기'}).click();await expect(page.locator('.preview-frame .caption-cell')).toHaveCount(4);
 const splitter=page.getByRole('separator',{name:'송출 모니터 너비'});await splitter.focus();await page.keyboard.press('Home');
 const fit=()=>page.locator('.preview-frame').evaluate(root=>{const body=root.querySelector('.caption-grid'),cells=[...body.querySelectorAll('.caption-cell')];return {fits:body.getBoundingClientRect().height<=root.clientHeight-18&&cells.every(c=>c.scrollWidth<=c.clientWidth+1),sizes:new Set(cells.map(c=>getComputedStyle(c).fontSize)).size}});
 await expect.poll(fit).toEqual({fits:true,sizes:1});
});

test('place cards have centered pin and operator monitor uses moderate proportional font',async({page})=>{await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await expect(page.locator('.block.place .place-pin')).toHaveCount(3);await expect(page.locator('.block.dialogue .block-kind').first()).toHaveText('드라마');await go(page).click();const p=page.locator('.program-frame');await expect.poll(()=>p.locator('.caption-grid').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(15);await expect.poll(()=>p.locator('.caption-grid').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)/e.closest('.operator-caption').clientWidth)).toBeLessThanOrEqual(.058);await page.goto('/?mode=audience');await expect(page.locator('.place-pin')).toHaveCount(0)});

test('caption size draft is local, limits are enforced, apply retains cue and persists',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();const program=page.locator('.monitors .program-frame');
 await page.getByRole('button',{name:'자막 스타일 100%'}).click();const slider=page.getByRole('slider',{name:'관객 자막 크기'});await expect(slider).toHaveAttribute('min','90');await expect(slider).toHaveAttribute('max','120');await slider.focus();await page.keyboard.press('End');await expect(program).toHaveAttribute('data-scale','100');await page.getByRole('button',{name:'취소'}).click();
 await page.getByRole('button',{name:'자막 스타일 100%'}).click();await page.getByRole('slider',{name:'관객 자막 크기'}).focus();await page.keyboard.press('End');await page.getByRole('button',{name:'스타일 적용'}).click();await expect(program).toHaveAttribute('data-scale','120');await expect(page.locator('.live-label')).toContainText('001 / 9');await page.reload();await expect(page.getByRole('button',{name:'자막 스타일 120%'})).toBeVisible();await page.getByRole('button',{name:'자막 스타일 120%'}).click();await page.getByRole('button',{name:'기본형',exact:true}).click();await page.getByRole('button',{name:'스타일 적용'}).click();await expect(page.getByRole('button',{name:'자막 스타일 100%'})).toBeVisible();
});

test('C group highlights all source lines and advances once per audience cue',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='group-fixture';d.title='그룹 테스트';d.blocks.splice(4,0,{...d.blocks[3],id:'second-line',text:'우리의 길을 찾아가'});d.blocks[3].text='새로운 하루를 열어';d.frames[2].sourceBlockIds=[d.frames[2].blockId,'second-line'];
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'group.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'그룹 테스트'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('그룹 테스트');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await go(page).click();await go(page).click();const group=page.locator('.cue-group.next');await expect(group.locator('[data-cue-status=NEXT]')).toHaveCount(2);await expect(group.getByRole('button',{name:'큐 003 미리보기'})).toHaveCount(1);
 await go(page).click();const live=page.locator('.cue-group.live');await expect(live.locator('[data-cue-status=LIVE]')).toHaveCount(2);await expect(live).toContainText('우리의 길을 찾아가');await expect(page.locator('.live-label')).toContainText('003 / 9');await expect(page.locator('.program-frame .caption-cell')).toHaveCount(2);await expect(live.getByRole('button',{name:'큐 003 미리보기'})).toHaveCount(1);await go(page).click();await expect(page.locator('.live-label')).toContainText('004 / 9');await expect(page.locator('.cue-group.live')).toHaveCount(0);
});

test('bundled fonts load locally, switch both monitors without advancing cue, persist',async({page})=>{
 const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/')&&!r.url().startsWith('data:'))external.push(r.url())});await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173/')?route.continue():route.abort());await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();
 for(const [id,family,w] of [['noto-sans','Noto Sans KR',700],['ibm-plex','IBM Plex Sans KR',500],['noto-serif','Noto Serif KR',600],['pretendard','Pretendard Variable',700]]){
 await page.getByRole('button',{name:'자막 스타일 100%'}).click();await page.getByRole('combobox',{name:'관객 자막 폰트'}).selectOption(id);await page.getByRole('button',{name:new RegExp(' · '+w+'$')}).click();await page.getByRole('button',{name:'스타일 적용'}).click();await expect(page.locator('.program-frame')).toHaveAttribute('data-font',id);await expect(page.locator('.preview-frame')).toHaveAttribute('data-font',id);await expect(page.locator('.program-frame .caption-grid')).toHaveCSS('font-weight',String(w));await expect.poll(()=>page.evaluate(async([family,w])=>{const faces=await document.fonts.load(w+' 24px "'+family+'"','가나다 경성 ABC');return faces.length>0&&faces.every(f=>f.status==='loaded')},[family,w])).toBe(true);await expect(page.locator('.live-label')).toContainText('001 / 9');
 }
 await page.reload();await page.getByRole('button',{name:'자막 스타일 100%'}).click();await expect(page.getByRole('combobox',{name:'관객 자막 폰트'})).toHaveValue('pretendard');expect(external).toEqual([]);
});

test('legacy two-line audience frame groups both source cards; heading is a centered separator with cue preserved',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='legacy-frame-fixture';d.title='프레임 연결 테스트';
 d.blocks[3].text='배우 A\t새로운 하루를 열어';d.blocks.splice(4,0,{...d.blocks[3],id:'legacy-second',text:'우리의 길을 찾아가'});d.frames[2].columns[0].lines=['새로운 하루를 열어\n우리의 길을 찾아가'];
 d.blocks.splice(0,0,{id:'heading-test',kind:'heading',actor:'',sceneId:'s1',text:'M01. 테스트 넘버 / 배우 A'});
 d.frames.unshift({id:'heading-black',blockId:'heading-test',kind:'black',trigger:'공연 시작',columns:[]});
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'프레임 연결 테스트'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('프레임 연결 테스트');await page.getByRole('button',{name:'닫기',exact:true}).click();
 const heading=page.locator('.script-divider');await expect(heading).toHaveCount(1);await expect(heading.locator('.divider-text')).toHaveCSS('text-align','center');await expect(heading).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(heading.getByRole('button',{name:'큐 001 미리보기'})).toContainText('BLACK');
 await go(page).click();await go(page).click();await go(page).click();const next=page.locator('.cue-group.next');await expect(next.locator('[data-cue-status=NEXT]')).toHaveCount(2);
 await go(page).click();const live=page.locator('.cue-group.live');await expect(live.locator('[data-cue-status=LIVE]')).toHaveCount(2);await expect(live).toContainText('우리의 길을 찾아가');await expect(page.locator('.live-label')).toContainText('004 / 10');await expect(live.getByRole('button',{name:'큐 004 미리보기'})).toHaveCount(1);
 await go(page).click();await expect(page.locator('.live-label')).toContainText('005 / 10');
});

test('arrow follows NAR and drama individually while audience remains black; Space keeps cue behavior',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await page.keyboard.press('ArrowRight');await expect(page.locator('.live-label')).toContainText('001 / 9');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#block-b2')).toHaveClass(/reading-hold/);await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);await expect(page.locator('.live-label')).toContainText('001 / 9');
 await page.keyboard.press('b');await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);
 await page.keyboard.press('ArrowRight');await expect(page.locator('#block-b3')).toHaveClass(/live/);await expect(page.locator('.live-label')).toContainText('002 / 9');await expect(page.locator('.reading-hold')).toHaveCount(0);
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#block-b2')).toHaveClass(/reading-hold/);await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);
 await page.keyboard.press('Space');await expect(page.locator('.live-label')).toContainText('003 / 9');await expect(page.locator('.reading-hold')).toHaveCount(0);
});
test('unanchored drama between black cue and lyrics gets its own reading step',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='reader-fixture';d.title='드라마 따라가기 테스트';d.blocks.splice(3,0,{id:'extra-drama',sceneId:'s1',kind:'dialogue',actor:'A',text:'추가 드라마 대사'});
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'reader.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'드라마 따라가기 테스트'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('드라마 따라가기 테스트');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await go(page).click();await go(page).click();await page.keyboard.press('ArrowRight');await expect(page.locator('#block-extra-drama')).toHaveClass(/reading-hold/);await expect(page.locator('.live-label')).toContainText('002 / 9');await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);await page.keyboard.press('ArrowRight');await expect(page.locator('.live-label')).toContainText('003 / 9');
});

test('explicit arrow navigation scrolls to drama even with automatic FOLLOW disabled',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await page.getByRole('button',{name:'FOLLOW ON'}).click();await expect(page.getByRole('button',{name:'FOLLOW OFF'})).toBeVisible();
 await page.keyboard.press('ArrowRight');await expect(page.locator('.live-label')).toContainText('001 / 9');await page.keyboard.press('ArrowRight');await expect(page.locator('#block-b2')).toHaveClass(/reading-hold/);await expect(page.locator('#block-b2')).toBeInViewport();await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);await page.keyboard.press('ArrowRight');await expect(page.locator('.live-label')).toContainText('002 / 9');
});

test('E records active cue and READ without altering playback, ignores repeat and text input, persists notes',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();await page.keyboard.press('e');await expect(page.locator('.error-mark')).toHaveCount(0);
 await page.getByRole('button',{name:'리허설 노트'}).click();await page.getByRole('button',{name:'새 리허설 시작'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.keyboard.press('e');await expect(page.locator('#block-b1 .error-mark')).toContainText('1회');await expect(page.locator('.live-label')).toContainText('001 / 9');
 await page.keyboard.down('e');await page.keyboard.down('e');await page.keyboard.up('e');await expect(page.locator('#block-b1 .error-mark')).toContainText('2회');await page.keyboard.press('Control+z');await expect(page.locator('#block-b1 .error-mark')).toContainText('1회');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#block-b2')).toHaveClass(/reading-hold/);await page.keyboard.press('e');await expect(page.locator('#block-b2 .error-mark')).toContainText('1회');await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);
 await page.getByRole('textbox',{name:'대사 · 가사 검색'}).fill('e');await page.keyboard.press('e');await expect(page.locator('#block-b2 .error-mark')).toContainText('1회');
 await page.getByRole('button',{name:/REHEARSAL/}).click();await expect(page.locator('.note-item')).toHaveCount(2);await page.locator('.note-item').last().getByText('메모',{exact:true}).locator('textarea').fill('내레이션 확인');await page.locator('.note-item').last().getByRole('checkbox').check();await page.reload();await expect(page.getByRole('button',{name:'리허설 노트'})).toBeEnabled();await page.getByRole('button',{name:'리허설 노트'}).click();await expect(page.locator('.note-item')).toHaveCount(2);await expect(page.locator('.note-item').last().locator('textarea').last()).toHaveValue('내레이션 확인');await expect(page.locator('.note-item').last().getByRole('checkbox')).toBeChecked();
});

test('B/E physical keys work on focused buttons, Korean layout and Ctrl aliases; protected input and repeat',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();
 await go(page).click();const program=page.locator('.program-frame');
 await expect(program.locator('.caption-cell')).toHaveCount(1);
 await go(page).focus();await page.keyboard.press('b');await expect(program.locator('.caption-cell')).toHaveCount(0);
 await page.keyboard.press('Control+b');await expect(program.locator('.caption-cell')).toHaveCount(1);
 await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyB',key:'ㅠ',bubbles:true,cancelable:true})));await expect(program.locator('.caption-cell')).toHaveCount(0);
 await page.keyboard.press('Control+b');await expect(program.locator('.caption-cell')).toHaveCount(1);
 await page.getByRole('button',{name:'리허설 노트'}).click();await page.getByRole('button',{name:'새 리허설 시작'}).click();
 await go(page).focus();await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'ㄷ',bubbles:true,cancelable:true})));await expect(page.locator('#block-b1 .error-mark')).toContainText('1회');
 await page.keyboard.press('Control+e');await expect(page.locator('#block-b1 .error-mark')).toContainText('2회');
 await page.keyboard.down('b');await page.keyboard.down('b');await page.keyboard.up('b');await expect(program.locator('.caption-cell')).toHaveCount(0);
 const search=page.getByRole('textbox',{name:'대사 · 가사 검색'});await search.focus();await page.keyboard.press('Control+b');await page.keyboard.press('Control+e');await page.keyboard.press('b');await page.keyboard.press('e');await expect(search).toHaveValue('be');await expect(program.locator('.caption-cell')).toHaveCount(0);await expect(page.locator('#block-b1 .error-mark')).toContainText('2회');
 await search.press('Escape');await page.keyboard.press('Control+b');await expect(program.locator('.caption-cell')).toHaveCount(1);await expect(page.locator('.live-label')).toContainText('001 / 9');
});

test('speaker prefix stays in header only; source lyric formatting and audience frame remain intact',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='speaker-display-fixture';d.title='화자 중복 표시 테스트';d.blocks[3].text='배우 A\t새로운 하루를 열어';d.blocks[3].runs=[{text:'배우 A',bold:true},{text:'\t'},{text:'새로운 하루를 열어',bold:true}];d.blocks.splice(4,0,{id:'speaker-second',sceneId:'s1',kind:'lyric',actor:'배우 A',text:'우리의 길을 찾아가'});d.frames[2].sourceBlockIds=['b4','speaker-second'];
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'speaker.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'화자 중복 표시 테스트'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('화자 중복 표시 테스트');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(page.locator('#block-b4 .actor-label')).toHaveText('배우 A');await expect(page.locator('#block-b4 .block-text')).toHaveText('새로운 하루를 열어');await expect(page.locator('#block-b4 .source-bold')).toHaveText('새로운 하루를 열어');
 await go(page).click();await go(page).click();await go(page).click();await expect(page.locator('.cue-group.live .block-text')).toHaveText(['새로운 하루를 열어','우리의 길을 찾아가']);await expect(page.locator('.program-frame .caption-cell')).toHaveText(['새로운 하루를 열어','우리의 길을 찾아가']);
});

test('A minus reaches 9px dense reader, reduces card height, persists and leaves audience size unchanged',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();
 const card=page.locator('#block-b4');const height=await card.evaluate(e=>e.getBoundingClientRect().height);const program=page.locator('.program-frame .caption-grid');const captionSize=await program.evaluate(e=>getComputedStyle(e).fontSize);
 const minus=page.getByRole('button',{name:'대본 글자 작게'});for(let i=0;i<8;i++)await minus.click();await expect(minus).toBeDisabled();await expect(page.locator('.script-scroll')).toHaveCSS('font-size','9px');await expect(page.locator('.script-scroll')).toHaveClass(/reader-dense/);expect(await card.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(height);await expect(program).toHaveCSS('font-size',captionSize);
 await page.reload();await expect(page.locator('.script-scroll')).toHaveCSS('font-size','9px');await page.getByRole('button',{name:'대본 글자 크기 초기화'}).click();await expect(page.locator('.script-scroll')).toHaveCSS('font-size','17px');await expect(page.locator('.script-scroll')).not.toHaveClass(/reader-dense/);
});

test('past units compress by reading position, expand without playback and reopen on reverse or search',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(page.locator('#block-b2')).toHaveClass(/reading-hold/);const summary=page.getByRole('button',{name:'이전 대본 큐 001'});await expect(summary).toBeVisible();await expect(summary).toHaveAttribute('aria-expanded','false');await expect(page.locator('#block-b1')).toBeHidden();
 await summary.click();await expect(page.locator('#block-b1')).toBeVisible();await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);await summary.click();await expect(page.locator('#block-b1')).toBeHidden();
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#block-b1')).toBeVisible();await expect(page.locator('.program-frame .caption-cell')).toHaveCount(1);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.locator('#block-b4')).toBeVisible();await expect(page.locator('#block-b5')).toBeVisible();
 await page.getByRole('textbox',{name:'대사 · 가사 검색'}).fill('악보');await expect(page.locator('#block-b2')).toBeVisible();await expect(page.locator('#block-b2')).toHaveClass(/search-hit/);await page.getByRole('button',{name:'현재 위치',exact:true}).click();await expect(page.locator('#block-b2')).toBeHidden();await expect(page.locator('.live-label')).toContainText('003 / 9');
});
test('Escape requests end confirmation only for active output; cancels or stops without changing script',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');await page.addInitScript(deck=>{
  const s={revision:1,deck,state:{index:0,blackout:false,sequence:1},active:'demo',versions:[{id:'demo',title:deck.title,revision:deck.revision,count:deck.frames.length}],output:{open:true,ready:true}};
  window.stopCalls=0;window.deckAPI={state:async()=>s,onState:()=>()=>{},stop:async()=>{window.stopCalls++;return {...s,revision:2,state:{...s.state,blackout:true,sequence:2},output:{open:false,ready:false}}}};
 },demo);
 await page.goto('/');await expect(page.getByRole('button',{name:'공연 종료',exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'공연 종료 확인'})).toBeVisible();expect(await page.evaluate(()=>window.stopCalls)).toBe(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(await page.evaluate(()=>window.stopCalls)).toBe(0);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'공연 종료 · Enter'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'▶ 공연 시작'})).toBeVisible();expect(await page.evaluate(()=>window.stopCalls)).toBe(1);await expect(page.locator('.program-frame .caption-cell')).toHaveCount(0);await expect(page.locator('.live-label')).toContainText('001 / 9');
});

test('overlap widths AUTO, manual preview edit, GO and persisted review',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();await go(page).click();await go(page).click();
 const preview=page.locator('.preview-frame'),program=page.locator('.program-frame');await expect(preview).toHaveAttribute('data-kind','overlap');const before=await program.getAttribute('data-ratios');
 await page.getByRole('button',{name:/열 너비 ·/}).click();const modal=page.getByRole('dialog');await expect(modal.getByRole('button',{name:'70:30',exact:true})).toBeEnabled();await modal.getByRole('button',{name:'70:30',exact:true}).click();await expect(modal.locator('.preview-frame')).toHaveAttribute('data-ratios','70:30');await modal.getByRole('button',{name:'큐 너비 저장'}).click();await expect(modal.getByRole('button',{name:'큐 너비 저장'})).toBeDisabled();await modal.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(preview).toHaveAttribute('data-ratios','70:30');await expect(program).toHaveAttribute('data-ratios',before);await expect(page.locator('.live-label')).toContainText('003 / 9');await go(page).click();await expect(program).toHaveAttribute('data-ratios','70:30');await expect(program.locator('.caption-cell')).toHaveCount(4);
 await page.reload();await page.getByRole('button',{name:'동시 가창 검수'}).click();await expect(page.getByRole('dialog').locator('.preview-frame')).toHaveAttribute('data-ratios','70:30');await page.getByRole('button',{name:'AUTO 복원'}).click();await page.getByRole('button',{name:'큐 너비 저장'}).click();await expect(page.getByRole('button',{name:'큐 너비 저장'})).toBeDisabled();await expect(page.getByRole('dialog').locator('.width-editor-title')).toContainText('AUTO');
});

test('audience renderer and operator use identical adaptive ratios, preserve blank lane, and expose no edit controls',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const view=structuredClone(demo.frames[3]);view.columns[0].lines=['가나다라마바사 아자차카타파하 가나다라마바사','여러 사람이 함께 부르는 긴 가사'];view.columns[1].lines=['아아',''];
 await page.addInitScript(view=>{window.deckAPI={outputState:async()=>({sequence:1,view,captionScale:100,captionFont:'pretendard',ratios:[70,30]}),onOutput:()=>()=>{},ack:()=>{}}},view);
 await page.goto('/?mode=audience');const audience=page.locator('.audience-caption');await expect(audience).toHaveAttribute('data-ratios','70:30');await expect(audience.locator('.caption-cell')).toHaveCount(4);await expect(audience.locator('.caption-cell').last()).toHaveText('');
 await expect(page.locator('.caption-boundary')).toHaveCount(0);await expect(page.getByRole('slider')).toHaveCount(0);
 const cols=await audience.locator('.caption-grid').evaluate(el=>{const cs=getComputedStyle(el);return {widths:cs.gridTemplateColumns.split(' ').map(parseFloat),sizes:new Set([...el.querySelectorAll('.caption-cell')].map(c=>getComputedStyle(c).fontSize)).size}});
 expect(cols.widths[0]/cols.widths[1]).toBeCloseTo(70/30,1);expect(cols.sizes).toBe(1);
});

test('solo review stores a local override and leaves current program unchanged until GO',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();await go(page).click();
 await page.getByRole('button',{name:'장문 · 큐 스타일 조절'}).click();await page.getByRole('slider',{name:'큐별 글자 크기'}).focus();await page.keyboard.press('Home');await page.getByRole('button',{name:'큐 스타일 저장'}).click();await expect(page.getByRole('button',{name:'큐 스타일 저장'})).toBeDisabled();await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.locator('.live-label')).toContainText('002 / 9');await go(page).click();await expect(page.locator('.program-frame .caption-cell')).toHaveCount(2);
 await page.reload();await page.getByRole('button',{name:'장문 가사 검수',exact:true}).click();await expect(page.getByRole('slider',{name:'큐별 글자 크기'})).toHaveValue('85');await page.getByRole('button',{name:'전역값 복원'}).click();await page.getByRole('button',{name:'큐 스타일 저장'}).click();await expect(page.getByRole('slider',{name:'큐별 글자 크기'})).toHaveValue('100');
});

test('solo two-line policy keeps authored text and fits an extra soft wrap by uniform reduction',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 const view={kind:'solo',columns:[{actor:'A',lines:['첫 번째 가사\n'+Array.from({length:24},()=> '가').join('')]}]};
 await page.addInitScript(view=>{window.deckAPI={outputState:async()=>({sequence:1,view,captionScale:100,captionFont:'pretendard',typography:{font:'pretendard',scale:100,weight:600,lineHeight:1.5,tracking:0,yOffset:0,policy:'prefer-two',relative:100}}),onOutput:()=>()=>{},ack:()=>{}}},view);
 await page.goto('/?mode=audience');const audience=page.locator('.audience-caption');await expect(audience.locator('.caption-cell')).toHaveText(view.columns[0].lines[0]);await expect(audience).toHaveAttribute('data-lines','2');await expect(audience).toHaveAttribute('data-risk','false');
 await expect(audience.locator('.caption-grid')).toHaveCSS('font-weight','600');await expect(audience.locator('.caption-grid')).toHaveCSS('letter-spacing','0px');
});
