import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs");

test("3D preview rotates real geometry, hides eyes from behind", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/spatial.html".replace(/^\//, "http://127.0.0.1:14517/"));
  const host = page.locator("#scene");
  await expect(host.locator("canvas")).toBeVisible();
  await page.locator("#motion").click();
  await page.locator("#orbit").uncheck();
  await page.locator("#hat").uncheck();
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "正面视角", exact: true }).click();
  await page.locator("#face").fill("#28332d");
  await page.locator("#jelly").fill("0");
  const countEyes = async () => {
    const png = PNG.sync.read(await host.screenshot());
    let count = 0;
    for (
      let i = Math.floor(png.height * 0.2) * png.width * 4;
      i < Math.floor(png.height * 0.8) * png.width * 4;
      i += 4
    )
      if (png.data[i] < 80 && png.data[i + 1] < 90 && png.data[i + 2] < 85)
        count++;
    return count;
  };
  await expect.poll(countEyes).toBeGreaterThan(100);
  await page.getByRole("button", { name: "背面视角", exact: true }).click();
  await expect.poll(countEyes).toBe(0);
  await page.getByRole("button", { name: "侧面视角", exact: true }).click();
  await expect(page.locator("#yaw-value")).toHaveText("90°");
  await page.getByRole("button", { name: "透视", exact: true }).click();
  await page.locator("#hat").check();
  await page.locator("#orbit").check();
  await page.locator("#body").fill("#abcabc");
  await expect(page.locator("#export")).toHaveCount(0);
  await expect(host.locator("svg")).toHaveCount(0);
  await page.screenshot({ path: "test-results/spatial-desktop.png" });
  expect(errors).toEqual([]);
});

test("3D mobile controls fit the viewport and keyboard, touch, reset and playback work", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:14517/spatial.html");
    const host = page.locator("#scene");
    await expect(host.locator("canvas")).toBeVisible();
    await expect(page.locator("#motion")).toHaveText("播放动画");
    await host.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#yaw-value")).toHaveText("6°");
    await page.keyboard.press("Home");
    await expect(page.locator("#yaw-value")).toHaveText("0°");
    const area = (await host.boundingBox())!;
    // Real touch capture, including a drag that crosses the canvas boundary.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: area.x + area.width / 2, y: area.y + area.height / 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: area.x + area.width / 2 + 70, y: area.y + area.height / 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator("#yaw-value")).not.toHaveText("0°");
    await page.getByRole("button", { name: "好奇", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "好奇", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#hat").uncheck();
    await page.locator("#reset").click();
    await expect(page.locator("#hat")).not.toBeChecked();
    await expect(page.locator("#yaw-value")).toHaveText("0°");
    await page.locator("#rotate").click();
    await expect
      .poll(() => page.locator("#yaw-value").textContent())
      .not.toEqual("0°");
    await page.locator("#rotate").click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: "test-results/spatial-mobile.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("radial SVG resources isolate ids, export and reject invalid input atomically", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/spatial.html");
  const result = await page.evaluate(async (root) => {
    const { createSvgRenderer } = await import(
      "/@fs" + root + "/packages/core/src/browser.ts"
    );
    const a = document.createElement("div"),
      b = document.createElement("div");
    const ra = createSvgRenderer(a),
      rb = createSvgRenderer(b);
    const gradient = {
      id: "soft",
      kind: "radialGradient",
      cx: 0,
      cy: 0,
      r: 1,
      fx: -0.2,
      fy: -0.3,
      transform: [100, 0, 0, 70, 160, 160],
      stops: [
        { offset: 0, color: "#ffffff", opacity: 0.4 },
        { offset: 1, color: "#000000" },
      ],
    };
    const frame = {
      bounds: { x: 0, y: 0, width: 320, height: 320 },
      anchors: [],
      resources: [gradient],
      shapes: [
        {
          id: "body",
          kind: "ellipse",
          attrs: { cx: 160, cy: 160, rx: 100, ry: 70 },
          paint: { fill: "soft" },
        },
      ],
    };
    ra.render(frame);
    rb.render(frame);
    const before = ra.svg.outerHTML;
    let rejected = 0;
    for (const patch of [
      { r: 0 },
      {
        stops: [
          { offset: 0, color: "#ffffff", opacity: 1.1 },
          { offset: 1, color: "#000000" },
        ],
      },
      { fx: 1 },
      { transform: [1, 0, 0, 0, 0, 0] },
      {
        stops: [
          { offset: 0, color: "url(https://bad.example)" },
          { offset: 1, color: "#000000" },
        ],
      },
    ]) {
      try {
        ra.render({ ...frame, resources: [{ ...gradient, ...patch }] });
      } catch {
        rejected++;
      }
    }
    const values = {
      opacity: ra.svg.querySelector("stop")!.getAttribute("stop-opacity"),
      rejected,
      unchanged: before === ra.svg.outerHTML,
      isolated:
        ra.svg.querySelector("radialGradient")!.id !==
        rb.svg.querySelector("radialGradient")!.id,
      transform: ra.svg
        .querySelector("radialGradient")!
        .getAttribute("gradientTransform"),
    };
    ra.destroy();
    rb.destroy();
    return values;
  }, process.cwd());
  expect(result).toEqual({
    opacity: "0.4",
    rejected: 5,
    unchanged: true,
    isolated: true,
    transform: "matrix(100 0 0 70 160 160)",
  });
});
