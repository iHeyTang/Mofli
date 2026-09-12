import { test, expect } from "@playwright/test";

test("3D switching reuses the main canvas and cached thumbnails without synchronous SVG sampling", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const old = HTMLCanvasElement.prototype.toDataURL;
    (window as any).thumbnailRenders = 0;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      (window as any).thumbnailRenders++;
      return old.apply(this, args);
    };
  });
  await page.goto("http://127.0.0.1:14517/");
  await page.locator("#rig-select").waitFor();
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/src/catalog.ts"))!.name;
    const { catalog } = await import(url);
    const rig = catalog.find((e: any) => e.rig.dimension === "3d").rig;
    rig.sample = () => {
      throw new Error(
        "3D cards must not synchronously sample a full SVG frame",
      );
    };
  });
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const cards = page.locator(".motion-strip .pet-thumbnail img");
  await expect(cards).toHaveCount(19);
  await expect
    .poll(() =>
      cards.evaluateAll((imgs) =>
        imgs.every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const canvas = await page.locator("#avatar canvas").elementHandle();
  const mallow = await cards.evaluateAll((imgs) =>
    imgs.map((i) => (i as HTMLImageElement).src),
  );
  await page.locator(".skin-tile").filter({ hasText: "Pip 3D" }).click();
  await expect(cards).toHaveCount(19);
  const pip = await cards.evaluateAll((imgs) =>
    imgs.map((i) => (i as HTMLImageElement).src),
  );
  expect(pip).not.toEqual(mallow);
  const rendered = await page.evaluate(() => (window as any).thumbnailRenders);
  await page.locator(".skin-tile").filter({ hasText: "Mallow 3D" }).click();
  await expect(cards).toHaveCount(19);
  expect(
    await cards.evaluateAll((imgs) =>
      imgs.map((i) => (i as HTMLImageElement).src),
    ),
  ).toEqual(mallow);
  expect(await page.evaluate(() => (window as any).thumbnailRenders)).toBe(
    rendered,
  );
  expect(
    await canvas!.evaluate(
      (el) => el === document.querySelector("#avatar canvas"),
    ),
  ).toBe(true);
  // Cancel obsolete work during rapid changes; the final character must own every card.
  for (const name of ["Pebble 3D", "Pip 3D", "Mallow 3D"])
    await page.locator(".skin-tile").filter({ hasText: name }).click();
  await expect(cards).toHaveCount(19);
  expect(
    await cards.evaluateAll((imgs) =>
      imgs.map((i) => (i as HTMLImageElement).src),
    ),
  ).toEqual(mallow);
  expect(errors).toEqual([]);
});

test("3D thumbnail failure never falls back to SVG", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      kind: any,
      ...args: any[]
    ) {
      if (String(kind).includes("webgl")) return null;
      return (original as any).call(this, kind, ...args);
    } as any;
  });
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("#avatar").getByRole("status")).toContainText(
    "WebGL",
  );
  await expect(page.locator("#avatar svg")).toHaveCount(0);
  await expect(page.locator(".motion-strip .pet-thumbnail img")).toHaveCount(0);
  await expect(page.locator(".motion-strip .pet-thumbnail").first()).toHaveText(
    "预览不可用",
  );
});

test("3D library keeps character and accessory tabs available", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await page.getByRole("button", { name: "创建", exact: true }).click();
  const tabs = page
    .locator(".segmented")
    .filter({ has: page.getByRole("button", { name: "角色", exact: true }) });
  await expect(page.locator(".skin-tile input")).toHaveCount(0);
  await tabs.getByRole("button", { name: "饰品", exact: true }).click();
  await expect(page.locator(".spatial-parts")).toBeVisible();
  await expect(
    tabs.getByRole("button", { name: "饰品", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "返回角色", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".spatial-parts").getByText("礼帽", { exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "角色", exact: true }).click();
  await expect(page.locator("#rig-select")).toBeVisible();
});

test("dimension scopes rigs and accessories and restores each draft", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.locator("#ink").fill("#a1b2c3");
  await page.locator("#rig-select").click();
  await expect(
    page.getByRole("option", { name: "Mofli 3D", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  await page.locator("#ink").fill("#c3b2a1");
  await page.locator("#rig-select").click();
  await expect(
    page.getByRole("option", { name: "Bloub", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Mew", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  const tabs = page
    .locator(".segmented")
    .filter({ has: page.getByRole("button", { name: "角色", exact: true }) });
  await tabs.getByRole("button", { name: "饰品", exact: true }).click();
  await page
    .locator(".spatial-parts")
    .getByLabel("礼帽", { exact: true })
    .check();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".spatial-parts")).toHaveCount(0);
  await expect(page.locator(".attachment-list")).toBeVisible();
  await expect(page.locator("#ink")).toHaveValue("#a1b2c3");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("#ink")).toHaveValue("#c3b2a1");
  await expect(
    page.locator(".spatial-parts").getByLabel("礼帽", { exact: true }),
  ).toBeChecked();
  await page.screenshot({ path: "test-results/dimension-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(page.locator(".spatial-parts")).toBeVisible();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".attachment-list")).toBeVisible();
  await page.locator("#mobile-tab-skins").click();
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await expect(page.getByText("新建 2D 宠物", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "宠物类型" })).toHaveCount(0);
  await page.getByRole("button", { name: "关闭新建", exact: true }).click();
  await page.screenshot({ path: "test-results/dimension-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("3D accessories reuse selectable preview cards on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  const library = page.getByRole("complementary", { name: "素材库" });
  await library.getByRole("button", { name: "饰品", exact: true }).click();
  const cards = page.locator(".spatial-parts .attachment-item");
  await expect(cards).toHaveCount(10);
  await expect(cards.locator("img")).toHaveCount(10);
  await expect
    .poll(() =>
      cards
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every(
            (img) =>
              (img as HTMLImageElement).complete &&
              (img as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await cards
      .locator("img")
      .evaluateAll(
        (imgs) =>
          new Set(imgs.map((img) => (img as HTMLImageElement).src)).size,
      ),
  ).toBe(10);
  await page.locator("#wear-3d-hat").check();
  await expect(
    cards
      .filter({ has: page.locator("#wear-3d-hat") })
      .locator(".attachment-check"),
  ).toBeVisible();
  await library
    .getByRole("button", { name: "移除头顶中央饰品", exact: true })
    .click();
  await expect(page.locator("#wear-3d-hat")).not.toBeChecked();
  await page.screenshot({ path: "test-results/accessory-cards-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(cards).toHaveCount(10);
  await page.locator("#wear-3d-ears").check();
  await expect(page.locator("#wear-3d-ears")).toBeChecked();
  await page.screenshot({ path: "test-results/accessory-cards-mobile.png" });
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".attachment-item").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("paused 3D edits finish their transition and then stop advancing", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/src/model.ts"))!.name;
    const { model } = await import(/* @vite-ignore */ url);
    (window as any).transitionModel = model;
    model.playing = false;
    model.setPose({ expression: 18 });
    (window as any).transitionStarted = model.time;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).transitionModel.time -
          (window as any).transitionStarted,
      ),
    )
    .toBeGreaterThanOrEqual(0.4);
  const time = await page.evaluate(() => (window as any).transitionModel.time);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).transitionModel.time)).toBe(
    time,
  );
});

test("3D accessory edits belong to each part and survive skin switches and saved configuration", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("#accessory")).toHaveCount(0);
  await page
    .locator(".segmented")
    .getByRole("button", { name: "饰品", exact: true })
    .click();
  await page.locator("#wear-3d-hat").check();
  await page.locator("#wear-3d-cat-ears").check();
  await page.locator("#wear-3d-orbit").check();
  await page.getByLabel("礼帽帽身", { exact: true }).fill("#f0aabb");
  await page.getByLabel("礼帽帽带", { exact: true }).fill("#eeeecc");
  await page.getByLabel("猫耳外耳", { exact: true }).fill("#88ccaa");
  await page.getByLabel("星尘环绕星光", { exact: true }).fill("#aabbff");
  await page.locator("#spatial-hat-size input").press("End");
  await page.locator("#save-local").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mofli.pet.v1")!),
  );
  expect(saved.skin.colors.accessory).toBeUndefined();
  expect(saved.rigConfig.hat).toBeUndefined();
  expect(
    saved.attachments.find((a: any) => a.type === "spatial-hat"),
  ).toMatchObject({
    colors: { fabric: "#f0aabb", band: "#eeeecc" },
    parameters: { size: 1.4 },
  });
  await page
    .locator(".segmented")
    .getByRole("button", { name: "角色", exact: true })
    .click();
  await page.getByRole("button", { name: /Pip 3D/ }).click();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "饰品", exact: true })
    .click();
  await expect(page.getByLabel("礼帽帽身", { exact: true })).toHaveValue(
    "#f0aabb",
  );
  const result = await page.evaluate(async (config) => {
    const url = performance
      .getEntriesByType("resource")
      .find((r) => r.name.includes("/src/model.ts"))!.name;
    const { model } = await import(/* @vite-ignore */ url);
    model.import(config);
    const flatten = (nodes: any[]): any[] =>
      nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
    return flatten(model.scene(true).nodes)
      .filter((n) => n.material)
      .map((n) => n.material.color);
  }, saved);
  expect(result).toContain("#f0aabb");
  expect(result).toContain("#88ccaa");
  expect(result).toContain("#aabbff");
  await page.screenshot({
    path: "test-results/accessory-parameters-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(page.getByLabel("礼帽帽身", { exact: true })).toHaveValue(
    "#f0aabb",
  );
  await page.screenshot({
    path: "test-results/accessory-parameters-mobile.png",
  });
});

test("stardust renders animated particles and exposes its controls on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page
    .locator(".segmented")
    .getByRole("button", { name: "饰品", exact: true })
    .click();
  await page.locator("#wear-3d-orbit").check();
  await expect(
    page.getByText("星尘环绕", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("星尘环绕星光", { exact: true })).toHaveValue(
    "#ffe074",
  );
  await expect(page.getByLabel("星尘环绕微尘", { exact: true })).toHaveValue(
    "#bca4ff",
  );
  await page.locator("#spatial-orbit-density input").press("End");
  await page.locator("#spatial-orbit-glow input").press("End");
  await page.locator("#spatial-orbit-trail input").press("End");
  const sample = () =>
    page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .find((r) => r.name.includes("/src/model.ts"))!.name;
      const { model } = await import(/* @vite-ignore */ url);
      const all = (nodes: any[]): any[] =>
        nodes.flatMap((n) => [n, ...all(n.children ?? [])]);
      return all(model.scene().nodes).find(
        (n) => n.id === "attachment-spatial-orbit-star-0",
      ).transform.position;
    });
  const before = await sample();
  await expect.poll(sample).not.toEqual(before);
  await expect(
    page
      .locator(".attachment-item")
      .filter({ has: page.locator("#wear-3d-orbit") })
      .locator(".pet-thumbnail img"),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/stardust-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-parts").click();
  await expect(page.locator("#wear-3d-orbit")).toBeChecked();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/stardust-mobile.png" });
  expect(errors).toEqual([]);
});
