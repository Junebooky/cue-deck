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
