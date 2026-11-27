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
 await page.goto('/');await expect(page.getByRole('button',{name:'대본 관리'})).toBeEnabled();await go(page).click();
 const program=page.locator('.program-frame');await expect(program).toHaveAttribute('data-scale','100');
 await page.getByRole('button',{name:'자막 크기 100%'}).click();const slider=page.getByRole('slider',{name:'관객 자막 크기'});await expect(slider).toHaveAttribute('min','90');await expect(slider).toHaveAttribute('max','120');await expect(slider).toHaveAttribute('step','5');
 await slider.focus();await page.keyboard.press('End');await expect(page.getByRole('button',{name:'자막 크기 늘리기'})).toBeDisabled();await expect(program).toHaveAttribute('data-scale','100');await page.getByRole('button',{name:'취소'}).click();await expect(program).toHaveAttribute('data-scale','100');
 await page.getByRole('button',{name:'자막 크기 100%'}).click();await page.getByRole('slider',{name:'관객 자막 크기'}).focus();await page.keyboard.press('End');await page.getByRole('button',{name:'자막 크기 적용'}).click();await expect(program).toHaveAttribute('data-scale','120');await expect(page.locator('.live-label')).toContainText('001 / 9');await page.reload();await expect(page.getByRole('button',{name:'자막 크기 120%'})).toBeVisible();
 await page.getByRole('button',{name:'자막 크기 120%'}).click();await page.getByRole('slider',{name:'관객 자막 크기'}).focus();await page.keyboard.press('Home');await expect(page.getByRole('button',{name:'자막 크기 줄이기'})).toBeDisabled();await page.getByRole('button',{name:'기본값'}).click();await page.getByRole('button',{name:'자막 크기 적용'}).click();await expect(page.getByRole('button',{name:'자막 크기 100%'})).toBeVisible();
});

test('C group highlights all source lines and advances once per audience cue',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const d=structuredClone(demo);d.productionId='group-fixture';d.title='그룹 테스트';d.blocks.splice(4,0,{...d.blocks[3],id:'second-line',text:'우리의 길을 찾아가'});d.blocks[3].text='새로운 하루를 열어';d.frames[2].sourceBlockIds=[d.frames[2].blockId,'second-line'];
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'group.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.locator('.version').filter({hasText:'그룹 테스트'}).getByRole('button',{name:'활성화'}).click();await expect(page.locator('.brand')).toContainText('그룹 테스트');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await go(page).click();await go(page).click();const group=page.locator('.cue-group.next');await expect(group.locator('[data-cue-status=NEXT]')).toHaveCount(2);await expect(group.getByRole('button',{name:'큐 003 미리보기'})).toHaveCount(1);
 await go(page).click();const live=page.locator('.cue-group.live');await expect(live.locator('[data-cue-status=LIVE]')).toHaveCount(2);await expect(live).toContainText('우리의 길을 찾아가');await expect(page.locator('.live-label')).toContainText('003 / 9');await expect(page.locator('.program-frame .caption-cell')).toHaveCount(2);await expect(live.getByRole('button',{name:'큐 003 미리보기'})).toHaveCount(1);await go(page).click();await expect(page.locator('.live-label')).toContainText('004 / 9');await expect(page.locator('.cue-group.live')).toHaveCount(0);
});
