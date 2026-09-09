import { test, expect } from "@playwright/test";
test("studio connects pointer gaze and primary click to both rigs", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/reference.html");
  for (const rig of ["bloub-reference", "cat-head"]) {
    await page.selectOption("#rig-select", rig);
    await page.locator('[data-state="idle"]').click();
    await page.locator("#avatar").scrollIntoViewIfNeeded();
    const host = page.locator("#avatar"),
      box = (await host.boundingBox())!;
    const x = () =>
      page
        .locator("#avatar mask path[transform]")
        .first()
        .getAttribute("transform");
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await page.waitForTimeout(350);
    const left = await x();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await page.waitForTimeout(350);
    const right = await x();
    const tx = (s: string | null) => Number(s!.slice(7, -1).split(/[ ,]+/)[4]);
    expect(tx(right)).toBeGreaterThan(tx(left));
    await host.click();
    await expect(page.locator("#state-code")).toHaveText("IDLE");
    if (rig === "cat-head") {
      await page.waitForTimeout(220);
      await page.screenshot({ path: "test-results/cat-click-shake.png", fullPage: true });
    }
    await host.focus();
    await page.keyboard.press("Enter");
  }
  await page.screenshot({
    path: "test-results/interaction-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/interaction-mobile.png",
    fullPage: true,
  });
});
