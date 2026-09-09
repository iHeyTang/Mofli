import { test, expect } from "@playwright/test";
test("pattern skin needs no per-state artwork and exports its definitions", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/reference.html");
  await page.selectOption("#rig-select", "cat-head");
  await page.selectOption("#skin-select", "patches");
  await page.locator("#seek").fill("1");
  await expect(
    page.locator('#avatar path[fill="#b87548"], #avatar path[fill="#ddd3c1"]'),
  ).toHaveCount(2);
  await page.screenshot({
    path: "test-results/markings-desktop.png",
    fullPage: true,
  });
  await page.locator('[data-state="notify"]').click();
  await page.locator("#seek").fill("1");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/markings-mobile.png",
    fullPage: true,
  });
});
