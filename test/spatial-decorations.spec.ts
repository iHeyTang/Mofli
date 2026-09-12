import { test, expect } from "@playwright/test";

test("animal accessories combine with centered sprout and survive mobile switching", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const library = page.getByRole("complementary", { name: "素材库" });
  await library.getByRole("button", { name: "饰品", exact: true }).click();
  for (const id of ["cat-ears", "cat-whiskers", "ears", "bow-tie"])
    await page.locator(`#wear-3d-${id}`).check();
  await expect(page.locator("#wear-3d-cat-ears")).toBeChecked();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/decorations-cat-desktop.png" });
  await page
    .locator("#avatar")
    .screenshot({ path: "test-results/rounded-cat-ears.png" });
  const yaw = page.getByRole("slider", { name: "左右转动", exact: true });
  for (const [name, angle] of [
    ["three-quarter", "0.8"],
    ["side", "1.57"],
    ["back", "3.14"],
  ]) {
    await yaw.focus();
    await page.keyboard.press("Home");
    for (let i = 0; i < Math.round((Number(angle) + Math.PI) / 0.01); i++)
      await page.keyboard.press("ArrowRight");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await page
      .locator("#avatar")
      .screenshot({ path: `test-results/plush-${name}.png` });
  }
  await yaw.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 314; i++) await page.keyboard.press("ArrowRight");
  await page.locator("#wear-3d-rabbit-ears").check();
  await expect(page.locator("#wear-3d-cat-ears")).not.toBeChecked();
  await expect(page.locator("#wear-3d-cat-whiskers")).toBeChecked();
  await expect(page.locator("#wear-3d-ears")).toBeChecked();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: "test-results/decorations-rabbit-desktop.png",
  });
  await page.locator("#avatar").screenshot({ path: "test-results/rabbit-sculpted-front.png" });
  await yaw.focus();
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page.locator("#avatar").screenshot({ path: "test-results/rabbit-sculpted-angle.png" });
  for (let i = 0; i < 100; i++) await page.keyboard.press("ArrowLeft");
  for (const name of ["Pip 3D", "Pebble 3D"]) {
    await library.getByRole("button", { name: "角色", exact: true }).click();
    await page.locator(".skin-tile").filter({ hasText: name }).click();
    await library.getByRole("button", { name: "饰品", exact: true }).click();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `test-results/decorations-${name.split(" ")[0]}.png`,
    });
  }
  await page.locator("#wear-3d-flower").check();
  await expect(page.locator("#wear-3d-ears")).not.toBeChecked();
  await page.locator("#wear-3d-crown").check();
  await expect(page.locator("#wear-3d-flower")).not.toBeChecked();
  await expect(page.getByText("头顶植饰", { exact: true })).toHaveCount(0);
  await page.locator("#wear-3d-blush").check();
  await expect(page.locator("#wear-3d-cat-whiskers")).not.toBeChecked();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/decorations-flower-crown.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(page.locator("#wear-3d-rabbit-ears")).toBeChecked();
  await page.screenshot({ path: "test-results/decorations-mobile.png" });
  expect(errors).toEqual([]);
});
