import { test, expect } from "@playwright/test";
test("accessory transmission is visible as percent and persists", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByRole("button", { name: "饰品", exact: true }).click();
  await page.locator("#wear-3d-cat-ears").check();
  const control = page.locator("#spatial-cat-ears-transmission");
  await expect(control).toContainText("84%");
  const slider = control.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(control).toContainText("0%");
  const transmission = () =>
    page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .find((r) => r.name.includes("/src/model.ts"))!.name;
      const { model } = await import(/* @vite-ignore */ url);
      const flatten = (nodes: any[]): any[] =>
        nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
      return flatten(model.scene(true).nodes)
        .filter((n) => n.id.includes("spatial-cat-ears") && n.material)
        .map((n) => n.material.transmission);
    });
  expect((await transmission()).every((n: number) => n === 0)).toBe(true);
  await page.keyboard.press("End");
  await expect(control).toContainText("100%");
  expect(await transmission()).toContain(1);
  await page.locator("#save-local").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mofli.pet.v1")!),
  );
  expect(
    saved.attachments.find((a: any) => a.type === "spatial-cat-ears").parameters
      .transmission,
  ).toBe(1);
  await page.screenshot({ path: "test-results/transmission-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(control).toContainText("100%");
  await control.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/transmission-mobile.png" });
});
