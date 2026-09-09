import { test, expect } from "@playwright/test";
test("cat study sheet exposes nine masters, size checks and comparison controls", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/design.html");
  await expect(page.locator(".portrait")).toHaveCount(9);
  await expect(page.locator(".mini")).toHaveCount(9);
  await page.getByRole("button", { name: "选择 A 方向" }).click();
  await expect(page.locator("#choice")).toContainText("已标记 A");
  await page.locator("#outline").check();
  await expect(page.locator("body")).toHaveClass("outline");
  await page.locator("#outline").uncheck();
  for (const link of await page.locator('.portrait a').all()) {
    const href=(await link.getAttribute('href'))!;
    if(href.startsWith('data:')) expect(href).toContain('image/svg+xml');
    else expect((await page.request.get(new URL(href,page.url()).href)).ok()).toBeTruthy();
  }
  await page.screenshot({
    path: "test-results/design-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/design-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
