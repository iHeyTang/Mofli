import { test, expect } from '@playwright/test';
test('new companion actions play on both 2D rigs and the 3D rig, desktop and mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:14517/reference.html');
  for (const rig of ['bloub-reference', 'cat-head']) {
    await page.selectOption('#rig-select', rig);
    await expect(page.locator('#states button')).toHaveCount(66);
    for (const action of ['boot-pulse', 'ponder-tilt', 'work-pump', 'attention-bob', 'victory-hop', 'sorry-bow']) {
      await page.locator(`[data-state="${action}"]`).click();
      await expect(page.locator('#state-code')).toHaveText(action.toUpperCase());
      await expect(page.locator('#avatar svg')).toBeVisible();
    }
    await page.locator('[data-state="boot-pulse"]').click();
    await page.screenshot({ path: `test-results/companion-${rig}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `test-results/companion-${rig}-mobile.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.setViewportSize({ width: 1360, height: 900 });
  }
  await page.goto('http://127.0.0.1:14517/');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.getByRole('tab', { name: /动作/ }).click();
  await expect(page.locator('[data-state]')).toHaveCount(60);
  for (const action of ['boot-pulse', 'work-pump', 'victory-hop']) {
    await page.locator(`[data-state="${action}"]`).click();
    await expect(page.locator('#avatar canvas')).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/companion-spatial-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/companion-spatial-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
