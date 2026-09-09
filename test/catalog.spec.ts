import { test, expect } from "@playwright/test";
test("catalog controls update each rig and preserve choices when switching states", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  for (const rig of ["bloub-reference", "cat-head"]) {
    await page.selectOption("#rig-select", rig);
    await expect(page.locator("#shape-choices button")).toHaveCount(9);
    await expect(page.locator("#expression-choices button")).toHaveCount(
      rig === "cat-head" ? 18 : 17,
    );
    await expect(page.locator("#palette-select")).toHaveCount(0);
    await page.locator('[data-shape="6"]').click();
    await expect(page.locator("#state-code")).toHaveText("IDLE");
    await page.locator('[data-expression="10"]').click();
    await page.locator("#ink").fill("#3b93f0");
    await expect(page.locator("#ink")).toHaveValue("#3b93f0");
    await page.locator('[data-state="notify"]').click();
    await expect(page.locator('[data-shape="6"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator('[data-state="idle"]').click();
  }
  await page.screenshot({
    path: "test-results/catalog-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/catalog-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
