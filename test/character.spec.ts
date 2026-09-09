import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
test("geometry presets and appearance controls remain independent", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.selectOption("#rig-select", "cat-head");
  await expect(page.locator("#skin-select option")).toHaveText([
    "墨黑",
    "Patches",
  ]);
  await page.getByRole("slider", { name: "耳长", exact: true }).fill("35");
  await expect(
    page.getByRole("slider", { name: "耳长", exact: true }),
  ).toHaveValue("35");
  await page.locator('[data-shape="6"]').click();
  await page.locator('[data-state="wide"]').click();
  await page.locator("#ink").fill("#3b93f0");
  await expect(page.locator("#state-code")).toHaveText("WIDE");
  await expect(
    page.getByRole("slider", { name: "耳长", exact: true }),
  ).toHaveValue("35");
  const downloading = page.waitForEvent("download");
  await page.locator("#save-skin").click();
  const file = await downloading;
  const saved = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(saved.rigConfig.earLength).toBe(35);
  expect(saved.rigConfig.shape).toBe(6);
  expect(saved.colors.body).toBe("#3b93f0");
  expect(saved.pose).toBeUndefined();
  await page.selectOption("#skin-select", "sesame");
  await expect(page.locator('[data-shape="-1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#state-code")).toHaveText("WIDE");
  await expect(
    page.getByRole("slider", { name: "耳长", exact: true }),
  ).toHaveValue("45");
  await page.screenshot({
    path: "test-results/character-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/character-mobile.png",
    fullPage: true,
  });
});
