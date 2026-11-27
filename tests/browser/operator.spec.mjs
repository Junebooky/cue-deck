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
 await go(page).click();await expect(page.getByRole('button',{name:'큐 002 미리보기'})).toContainText('BLACK');await expect(page.getByRole('button',{name:'큐 002 미리보기'})).toContainText('NEXT');await expect(page.locator('.block.dialogue .block-kind').first()).toHaveText('일반 대사');
 await page.goto('/?mode=audience');await expect(page.locator('.program-lamp')).toHaveCount(0);
});

test('same production update requires review and keeps old version until confirmed',async({page})=>{
 const {demo}=await import('../../src/demo.mjs');const revised=structuredClone(demo);revised.title='수정된 연습 대본';revised.revision='demo-2';revised.blocks[3].text='변경된 가사';revised.frames[2].columns[0].lines[0]='변경된 가사';revised.frames[2].trigger='변경된 가사';
 await page.goto('/');await page.getByRole('button',{name:'대본 관리'}).click();await page.getByLabel('공연 데이터 파일').setInputFiles({name:'new.cuedeck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(revised))});
 const version=page.locator('.version').filter({hasText:'수정된 연습 대본'});await version.getByRole('button',{name:'활성화'}).click();await expect(page.getByRole('dialog')).toContainText('SCRIPT REVISION REVIEW');await expect(page.locator('.review-list')).toContainText('변경된 가사');await expect(page.getByRole('button',{name:'검토 후 활성화'})).toBeDisabled();await expect(page.locator('.brand')).not.toContainText('수정된 연습 대본');
 await page.getByRole('checkbox',{name:'변경 사항 및 원본 연결을 검토했습니다.'}).check();await page.getByRole('button',{name:'검토 후 활성화'}).click();await expect(page.locator('.brand')).toContainText('수정된 연습 대본');await expect(page.locator('.version').filter({hasText:'수정된 연습 대본'}).getByRole('button',{name:'사용 중'})).toBeDisabled();
});
