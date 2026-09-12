import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");
test("reference homepage has 66 real state previews, transport, scrubbing and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/reference.html");
  await expect(page.locator("[data-state]")).toHaveCount(66);
  await expect(page.locator("#avatar svg")).toHaveCount(1);
  await page.locator('[data-state="orbit"]').click();
  await page.locator("#seek").fill("1.2");
  await page.locator("#seek").dispatchEvent("input");
  await page.locator("#play").click();
  await expect(page.locator("#state-code")).toHaveText("ORBIT");
  await expect(page.locator("#avatar linearGradient")).not.toHaveCount(0);
  const frozen = await page.locator("#avatar").innerHTML();
  await page.waitForTimeout(120);
  expect(await page.locator("#avatar").innerHTML()).toEqual(frozen);
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  expect((await download).suggestedFilename()).toBe("bloub-orbit.svg");
  await page.screenshot({
    path: "test-results/bloub-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/bloub-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Mofli render matches original SVG raster across 14 states and transient frames", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const cases = await page.evaluate(async (root) => {
    const { bloubStates } = await import(
      "/@fs" + root + "/packages/grove/src/rigs/bloub/index.ts"
    );
    return bloubStates.flatMap(
      (s: { id: string; index: number; posterTime: number }) => [
        { id: s.id, index: s.index, time: s.posterTime },
        { id: s.id, index: s.index, time: 0.3 },
      ],
    );
  }, process.cwd());
  await page.evaluate(() => {
    document.body.replaceChildren();
    document.body.style.cssText =
      "margin:0;background:#f9f9f9;display:flex;gap:0";
    for (const id of ["actual", "oracle"]) {
      const d = document.createElement("div");
      d.id = id;
      d.style.cssText = "width:316px;height:316px;flex:none;background:#f9f9f9";
      document.body.append(d);
    }
  });
  for (const c of cases) {
    await page.evaluate(
      async ({ root, c }) => {
        const { PetEngine } = await import(
          "/@fs" + root + "/packages/core/src/index.ts"
        );
        const { createSvgRenderer } = await import(
          "/@fs" + root + "/packages/core/src/browser.ts"
        );
        const { bloubSkin } = await import(
          "/@fs" + root + "/packages/grove/src/skins/bloub/index.ts"
        );
        const { bloubRig } = await import(
          "/@fs" + root + "/packages/grove/src/rigs/bloub/index.ts"
        );
        const { BotEngine } = await import(
          "/@fs" + root + "/packages/grove/src/rigs/bloub/vendor/engine.ts"
        );
        const { originalSvg } = await import(
          "/@fs" + root + "/test/fixtures/bloub-oracle.ts"
        );
        const host = document.getElementById("actual")!;
        host.replaceChildren();
        const r = createSvgRenderer(host);
        r.svg.style.cssText = "display:block;width:316px;height:316px";
        r.render(
          // Compare upstream raster geometry with the upstream palette explicitly.
          new PetEngine(bloubRig, { ...bloubSkin, colors: { body: "#0a0a0c", paper: "#f9f9f9" } }, { pose: { state: c.index } }).sample(c.time),
        );
        document.getElementById("oracle")!.innerHTML = originalSvg(
          new BotEngine(100, c.id).sample(c.time),
          "original",
        );
      },
      { root: process.cwd(), c },
    );
    const a = PNG.sync.read(await page.locator("#actual").screenshot()),
      b = PNG.sync.read(await page.locator("#oracle").screenshot());
    let diff = 0,
      total = 0;
    for (let i = 0; i < a.data.length; i++) {
      const delta = Math.abs(a.data[i] - b.data[i]);
      if (delta > 8) diff++;
      total += delta;
    }
    expect(
      diff / a.data.length,
      `${c.id}@${c.time} pixel mismatch`,
    ).toBeLessThan(0.003);
    expect(
      total / a.data.length,
      `${c.id}@${c.time} average pixel error`,
    ).toBeLessThan(0.4);
  }
});

test("SVG resources are instance-local and unresolved resources fail before mutation", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const result = await page.evaluate(async (root) => {
    const { PetEngine } = await import(
      "/@fs" + root + "/packages/core/src/index.ts"
    );
    const { bloubSkin } = await import(
      "/@fs" + root + "/packages/grove/src/skins/bloub/index.ts"
    );
    const { bloubRig } = await import(
      "/@fs" + root + "/packages/grove/src/rigs/bloub/index.ts"
    );
    const { createSvgRenderer } = await import(
      "/@fs" + root + "/packages/core/src/browser.ts"
    );
    const frame = new PetEngine(bloubRig, bloubSkin).sample(1);
    const a = createSvgRenderer(document.createElement("div")),
      b = createSvgRenderer(document.createElement("div"));
    a.render(frame);
    b.render(frame);
    const distinct =
      a.svg.querySelector("mask")!.id !== b.svg.querySelector("mask")!.id;
    const before = a.svg.innerHTML;
    let rejected = false;
    try {
      a.render({ ...frame, resources: [] });
    } catch {
      rejected = true;
    }
    const intact = before === a.svg.innerHTML;
    a.destroy();
    b.destroy();
    return { distinct, rejected, intact };
  }, process.cwd());
  expect(result).toEqual({ distinct: true, rejected: true, intact: true });
});

test("manual clicks morph body and eyes through the upstream pose controller", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("http://127.0.0.1:14517/reference.html");
  // Read exact animation time; native range inputs otherwise quantize to their step.
  await page.locator("#seek").evaluate((e) => e.setAttribute("step", "any"));
  await page.locator("#play").click();
  for (const [from, to] of [
    ["wide", "notify"],
    ["hexagon", "exclaim"],
    ["orbit", "egg"],
  ]) {
    await page.locator(`[data-state="${from}"]`).click();
    await page.locator("#seek").fill("1");
    await page.locator("#seek").dispatchEvent("input");
    const before = await page
      .locator("#avatar mask path")
      .first()
      .getAttribute("d");
    await page.locator(`[data-state="${to}"]`).click();
    expect(
      await page.locator("#avatar mask path").first().getAttribute("d"),
    ).toBe(before);
    await page.locator("#play").click();
    await page.clock.runFor(100);
    await page.locator("#play").click();
    const result = await page.evaluate(
      async ({ root, from, to }) => {
        const { BotEngine } = await import(
          "/@fs" + root + "/packages/grove/src/rigs/bloub/vendor/engine.ts"
        );
        const oracle = new BotEngine(100, from);
        oracle.setState(to, 1);
        const elapsed = Number(
          (document.getElementById("seek") as HTMLInputElement).value,
        );
        const expected = oracle.sample(1 + elapsed);
        const mask = document.querySelector("#avatar mask")!;
        return {
          elapsed,
          actual: mask.querySelector("path")!.getAttribute("d"),
          expected: expected.bodyPath,
          actualEyes: Array.from(mask.querySelectorAll("path"))
            .slice(1)
            .map((e) => e.getAttribute("d")),
          expectedEyes: expected.eyes.map((e: { d: string }) => e.d),
          maskedBodies: document.querySelectorAll("#avatar rect[mask]").length,
        };
      },
      { root: process.cwd(), from, to },
    );
    expect(result.elapsed).toBeGreaterThan(0);
    expect(result.elapsed).toBeLessThan(0.4);
    expect(result.actual).toBe(result.expected);
    expect(result.actualEyes).toEqual(result.expectedEyes);
    expect(result.maskedBodies).toBe(1);
  }
  await page.screenshot({
    path: "test-results/bloub-morph-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/bloub-morph-mobile.png",
    fullPage: true,
  });
});

test("cat rig separates geometry presets from appearance, sixty-six poses and working playback controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/reference.html");
  await expect(page.locator("#rig-select option")).toHaveCount(2);
  await page.selectOption("#rig-select", "cat-head");
  await expect(page.locator("#skin-select option")).toHaveText([
    "Ink",  "Patches",
  ]);
  await expect(page.locator("[data-state]")).toHaveCount(66);
  await expect(page.locator("#cycle")).toBeHidden();
  await page.locator('[data-state="sleep"]').click();
  await page.locator("#seek").fill("1");
  await page.locator("#play").click();
  const before = await page.locator("#avatar").innerHTML();
  await page.waitForTimeout(100);
  expect(await page.locator("#avatar").innerHTML()).toEqual(before);
  await page.selectOption("#skin-select", "sesame");
  await expect(page.locator("#ink")).toHaveValue("#0a0a0c");
  await page.locator("#face").fill("#123456");
  await page.locator("#restore").click();
  await expect(page.locator("#face")).toHaveValue("#f9f9f9");
  await page.locator("#restart").click();
  await page.locator('[data-state="wide"]').click();
  await page.locator("#seek").fill("1");
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  expect((await download).suggestedFilename()).toBe("sesame-wide.svg");
  await page.screenshot({
    path: "test-results/cat-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/cat-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.selectOption("#rig-select", "bloub-reference");
  await expect(page.locator("[data-state]")).toHaveCount(66);
  await expect(page.locator("#cycle")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cat integrated silhouette remains finite through the full state catalog", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  await page.selectOption("#rig-select", "cat-head");
  await page.locator("#play").click();
  const ids = await page
    .locator("[data-state]")
    .evaluateAll((es) => es.map((e) => e.getAttribute("data-state")!));
  for (const id of ids) {
    await page.locator(`[data-state="${id}"]`).click();
    await page.locator("#seek").fill("1");
    await page.screenshot({
      path: `test-results/cat-${id}.png`,
      fullPage: true,
    });
    const joined = await page.locator("#avatar").evaluate((svg) => {
      const body = svg.querySelector("mask path") as SVGPathElement;
      const box = body.getBBox();
      return (
        [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
        !/NaN|Infinity/.test(body.getAttribute("d")!)
      );
    });
    expect(joined, id).toBe(true);
  }
});
