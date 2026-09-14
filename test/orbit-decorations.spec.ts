import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs");

const ids = ["constellation", "comet", "fireflies"];
const { writeFile } = await import("node:fs/promises");

/** Fireflies pulse, so a single frame can catch them at their dimmest. The clock is
 * paused, so each frame has to be advanced explicitly before it is sampled. */
async function brightest(
  page: import("@playwright/test").Page,
  host: import("@playwright/test").Locator,
  path: string,
) {
  let best: Buffer | undefined,
    bestScore = -1;
  for (let i = 0; i < 6; i++) {
    // Play briefly, then pause again at the new time.
    await page.locator("#motion").click();
    await page.waitForTimeout(140);
    await page.locator("#motion").click();
    await page.waitForTimeout(80);
    const shot = await host.screenshot();
    const png = PNG.sync.read(shot);
    let score = 0;
    for (let p = 0; p < png.data.length; p += 4)
      if (
        png.data[p]! > 150 &&
        png.data[p + 1]! > 200 &&
        png.data[p + 2]! < 190
      )
        score++;
    if (score > bestScore) {
      bestScore = score;
      best = shot;
    }
  }
  await writeFile(path, best!);
  return bestScore;
}

test("orbiting decorations render together and alone", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1400, height: 950 });
  await page.goto("http://127.0.0.1:14517/spatial.html");
  const scene = page.locator("#scene");
  await expect(scene.locator("canvas")).toBeVisible();
  await page.locator("#motion").click();
  for (const id of ids) await page.locator(`#${id}`).check();
  await page.waitForTimeout(500);
  await scene.screenshot({ path: "test-results/orbit-rings-desktop.png" });
  for (const id of ids) await expect(page.locator(`#${id}`)).toBeChecked();
  // Each band on its own, so a broken ring cannot hide behind its neighbours.
  for (const id of ids) {
    for (const other of ids)
      if (other !== id) await page.locator(`#${other}`).uncheck();
    await page.waitForTimeout(400);
    await brightest(page, scene, `test-results/orbit-${id}.png`);
  }
  // Re-wear all three, then confirm the narrow layout still renders them.
  for (const id of ids) await page.locator(`#${id}`).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await scene.screenshot({ path: "test-results/orbit-rings-mobile.png" });
  await page.screenshot({ path: "test-results/orbit-rings-mobile-page.png" });
  for (const id of ids) await expect(page.locator(`#${id}`)).toBeChecked();
  expect(errors).toEqual([]);
});
