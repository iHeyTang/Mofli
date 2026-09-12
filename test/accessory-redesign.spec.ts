import { test, expect } from "@playwright/test";
test("redesigned soft accessories render in front, side and mobile views", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByRole("button", { name: "饰品", exact: true }).click();
  for (const id of ["rabbit-ears", "bow-tie", "flower"])
    await page.locator(`#wear-3d-${id}`).check();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page
    .locator("#avatar")
    .screenshot({ path: "test-results/redesign-flower.png" });
  await page.locator("#wear-3d-crown").check();
  await expect(page.locator("#wear-3d-flower")).not.toBeChecked();
  await page.waitForTimeout(500);
  await page
    .locator("#avatar")
    .screenshot({ path: "test-results/redesign-crown.png" });
  const yaw = page.getByRole("slider", { name: "左右转动", exact: true });
  await yaw.focus();
  for (let i = 0; i < 110; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page
    .locator("#avatar")
    .screenshot({ path: "test-results/redesign-side.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await page.screenshot({ path: "test-results/redesign-mobile.png" });
  expect(errors).toEqual([]);
});
