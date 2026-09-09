import { test, expect } from '@playwright/test';
test('studio exposes all six skins with compatible controls and activities', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/reference.html');
  await expect(page.locator('#rig-select option')).toHaveCount(2);
  await expect(page.locator('#rig-select')).not.toContainText('实验');
  let count = 0;
  for (const [rig, skins] of [
    ['bloub', ['bloub-reference', 'mofli-dough', 'mofli-bean', 'mofli-stone']], ['cat-head', ['sesame', 'patches']],
  ] as const) {
    // Read the actual public rig ids for the reference entries, whose ids may be versioned.
    const option = page.locator('#rig-select option').filter({hasText: rig === 'bloub' ? 'Bloub' : 'Cat Head'});
    await page.locator('#rig-select').selectOption((await option.getAttribute('value'))!);
    await expect(page.locator('#skin-select option')).toHaveCount(skins.length);
    for (const skin of skins) {
      await page.locator('#skin-select').selectOption(skin);
      await expect(page.locator('#avatar svg')).toBeVisible();
      count++;
    }

  }
  expect(count).toBe(6);
  await page.screenshot({path:'test-results/all-skins-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/all-skins-mobile.png',fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#rig-select').selectOption({label:'Cat Head · 部件骨架'});
  await expect(page.locator('.choice-library')).toBeVisible();
  expect(errors).toEqual([]);
});
