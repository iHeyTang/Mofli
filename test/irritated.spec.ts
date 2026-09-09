import { test, expect } from "@playwright/test";
test("cat irritated expression can be previewed separately from click shake", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/reference.html");
  await page.selectOption("#rig-select", "cat-head");
  await expect(page.locator('[data-expression="16"]')).toContainText("> <");
  await page.locator('[data-expression="16"]').click();
  await page.locator("#seek").fill("1");
  await page.locator("#play").click();
  await expect(page.locator("#states button")).toHaveCount(14);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/irritated-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/irritated-mobile.png",
    fullPage: true,
  });
  await page.selectOption("#rig-select", "bloub-reference");
  await expect(page.locator('[data-expression="16"]')).toContainText("Irritated");
});
