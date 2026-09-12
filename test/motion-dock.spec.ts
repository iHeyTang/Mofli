import { test, expect } from "@playwright/test";

test("motion dock stays fixed across collections and remembers manual resizing", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  const dock = page.locator(".motion-dock-resizable");
  const height = () => dock.evaluate((el) => el.getBoundingClientRect().height);
  const initial = await height();
  const preview = page.locator(".preview-frame");
  const initialPreview = await preview.boundingBox();
  for (const name of ["动作", "基础形状", "表情"]) {
    await dock.getByRole("tab", { name: new RegExp(name) }).click();
    expect(await height()).toBe(initial);
    expect(await preview.boundingBox()).toEqual(initialPreview);
    const labels = await dock.locator(".motion-tile span").allTextContents();
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((label) => /[\u4e00-\u9fff]/.test(label))).toBe(true);
  }
  const handle = dock.getByRole("separator");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 80, {
    steps: 8,
  });
  await page.mouse.up();
  expect(await height()).toBe(initial + 80);
  await handle.focus();
  await page.keyboard.press("ArrowDown");
  expect(await height()).toBe(initial + 56);
  await page.reload();
  expect(await height()).toBe(initial + 56);
  await dock.getByRole("tab", { name: /动作/ }).click();
  const strip = dock.locator(".motion-strip");
  expect(await strip.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/motion-dock-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-state").click();
  await expect(
    page.locator(".mobile-editor .motion-tile").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("separator", { name: "调整动作面板高度" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/motion-dock-mobile.png" });
});

test("both 2D rigs expose Chinese names for every collection", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  for (const rig of ["Bloub", "Mew"]) {
    await page.locator("#rig-select").click();
    await page.getByRole("dialog", { name: "骨架" }).getByRole("option", { name: rig, exact: true }).click();
    const dock = page.locator(".motion-dock-resizable");
    for (const name of ["表情", "动作", "基础形状"]) {
      await dock.getByRole("tab", { name: new RegExp(name) }).click();
      const labels = await dock.locator(".motion-tile span").allTextContents();
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.every((label) => /[\u4e00-\u9fff]/.test(label))).toBe(true);
    }
  }
});
