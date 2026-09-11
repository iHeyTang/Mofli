import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs");

test("create a 3D pet, export and restore without changing its definition", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await page.getByRole("textbox", { name: "名字" }).fill("Fern");
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  await page.locator("#ink").fill("#82a791");
  await page.locator("#save-local").click();
  const config = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mofli.pet.v1")!),
  );
  expect(config.skin.name).toBe("Fern");
  expect(config.skin.rig).toBe("spatial-pet");
  const choose = page.getByRole("combobox", { name: "3D 渲染方式" });
  await expect(choose).toHaveCount(0);
  await page.locator("#save-local").click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("mofli.pet.v1")!),
    ),
  ).toEqual(config);
  await page.screenshot({ path: "test-results/studio-3d-desktop.png" });
  await page.getByRole("link", { name: "项目与导出" }).click();
  await expect(page.locator("#export")).toHaveCount(0);
  await page.getByRole("link", { name: "创作", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page.locator("#avatar svg")).toBeAttached();
  await expect(choose).toHaveCount(0);
  await page.getByRole("link", { name: "项目与导出" }).click();
  await page.locator("#restore-pet").click();
  await page.getByRole("link", { name: "创作", exact: true }).click();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  await expect(page.locator("#ink")).toHaveValue("#82a791");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#mobile-tab-properties").click();
  await page.screenshot({ path: "test-results/studio-3d-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const stage = (await page.locator("#stage").boundingBox())!,
    tabs = (await page.locator(".mobile-tabs").boundingBox())!;
  expect(stage.y + stage.height).toBeLessThan(tabs.y);
  expect(stage.height).toBeGreaterThan(160);
  expect(errors).toEqual([]);
});

test("WebGL renders smooth surfaces with real depth and hides eyes from behind", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/spatial.html");
  await page.locator("#motion").click();
  await page.locator("#orbit").uncheck();
  await page.locator("#hat").uncheck();
  await expect(page.locator("#scene canvas")).toBeVisible();
  await page.locator("#face").fill("#28332d");
  await page.locator("#jelly").fill("0");
  const countEyes = async () => {
    const png = PNG.sync.read(await page.locator("#scene").screenshot());
    let count = 0;
    for (
      let i = Math.floor(png.height * 0.2) * png.width * 4;
      i < Math.floor(png.height * 0.8) * png.width * 4;
      i += 4
    )
      if (
        Math.abs(png.data[i] - 40) < 2 &&
        Math.abs(png.data[i + 1] - 51) < 2 &&
        Math.abs(png.data[i + 2] - 45) < 2
      )
        count++;
    return count;
  };
  await page.getByRole("button", { name: "正面视角", exact: true }).click();
  await expect.poll(countEyes).toBeGreaterThan(100);
  await page.getByRole("button", { name: "背面视角", exact: true }).click();
  await expect.poll(countEyes).toBe(0);
  await expect(page.locator("#export")).toHaveCount(0);
});

test("public 3D runtime uses WebGL without SVG sampling, handles context loss, and disposes", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const result = await page.evaluate(async (root) => {
    const { createPet } = await import(
      "/@fs" + root + "/packages/core/src/browser.ts"
    );
    const { spatialRig, spatialSkin } = await import(
      "/@fs" + root + "/packages/grove/src/rigs/spatial/index.ts"
    );
    const host = document.createElement("div");
    host.style.cssText = "width:320px;height:320px";
    document.body.append(host);
    const pet = createPet({
      container: host,
      rig: {
        ...spatialRig,
        sample() {
          throw new Error("SVG sample is not needed");
        },
      },
      skin: spatialSkin,
    });
    pet.setPaused(true);
    pet.setPose({ yaw: 0.7, expression: 2 });
    const before = pet.exportConfig();
    const gpu = pet.getRenderer();
    const svg = !!host.querySelector("svg path");
    const same = JSON.stringify(before) === JSON.stringify(pet.exportConfig());
    const canvas = host.querySelector("canvas")!;
    await new Promise<void>((resolve) => {
      canvas.addEventListener("webglcontextlost", () => resolve(), {
        once: true,
      });
      canvas
        .getContext("webgl")!
        .getExtension("WEBGL_lose_context")!
        .loseContext();
    });
    const fallback = pet.getRenderer();
    pet.destroy();
    pet.destroy();
    const cleaned = host.childElementCount === 0;
    host.remove();
    return { gpu, svg, same, fallback, cleaned };
  }, process.cwd());
  expect(result).toEqual({
    gpu: "webgl",
    svg: false,
    same: true,
    fallback: "unavailable",
    cleaned: true,
  });
});

test("3D reports unavailable WebGL without an SVG fallback", async ({
  page,
}) => {
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
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page.locator("#avatar")).toHaveAttribute(
    "data-renderer",
    "unavailable",
  );
  await expect(page.locator("#avatar svg")).toHaveCount(0);
  await expect(page.locator("#avatar").getByRole("status")).toContainText(
    "WebGL",
  );
});

test("GPU depth resolves crossing surfaces independently of draw order and projection", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const colors = await page.evaluate(async (root) => {
    const { createWebGLRenderer } = await import(
      "/@fs" + root + "/packages/core/src/webgl.ts"
    );
    const host = document.createElement("div");
    host.style.cssText = "width:320px;height:320px";
    document.body.append(host);
    const r = createWebGLRenderer(host),
      gl = r.canvas.getContext("webgl")!;
    const node = (id: string, color: string, sign: number) => ({
      id,
      material: { color, unlit: true, doubleSided: true },
      geometry: {
        vertices: [
          [-1, -1, -0.6 * sign],
          [1, -1, 0.6 * sign],
          [1, 1, 0.6 * sign],
          [-1, 1, -0.6 * sign],
        ],
        triangles: [
          [0, 1, 2],
          [0, 2, 3],
        ],
      },
    });
    const nodes = [node("red", "#ff0000", 1), node("blue", "#0000ff", -1)],
      values = [];
    for (const projection of ["orthographic", "perspective"])
      for (const order of [nodes, [...nodes].reverse()]) {
        r.render({
          camera: {
            projection,
            position: [0, 0, 6],
            size: 4,
            fov: Math.PI / 4,
          },
          nodes: order,
        });
        const pixel = new Uint8Array(4);
        for (const x of [0.4, 0.6]) {
          gl.readPixels(
            Math.floor(r.canvas.width * x),
            Math.floor(r.canvas.height / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixel,
          );
          values.push([...pixel]);
        }
      }
    r.destroy();
    host.remove();
    return values;
  }, process.cwd());
  expect(colors).toEqual(
    Array.from({ length: 4 }, () => [
      [0, 0, 255, 255],
      [255, 0, 0, 255],
    ]).flat(),
  );
});

test("jelly transmits scene colors and refracts their screen-space boundaries", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const results = await page.evaluate(async (root) => {
    const { createWebGLRenderer } = await import(
      "/@fs" + root + "/packages/core/src/webgl.ts"
    );
    const { ellipsoid3D, box3D } = await import(
      "/@fs" + root + "/packages/core/src/scene3d.ts"
    );
    const host = document.createElement("div");
    host.style.cssText = "width:320px;height:320px;background:#f9f9f6";
    document.body.append(host);
    const r = createWebGLRenderer(host),
      gl = r.canvas.getContext("webgl")!;
    const body = {
      id: "jelly",
      geometry: ellipsoid3D([1, 1, 0.65], 64, 32),
      material: { color: "#eeeeee", transmission: 1 },
    };
    const stripes = Array.from({ length: 9 }, (_, i) => ({
      id: "stripe" + i,
      geometry: box3D([0.22, 2, 0.1]),
      transform: { position: [(i - 4) * 0.22, 0, -1] },
      material: { color: i % 2 ? "#ff0000" : "#0000ff", unlit: true },
    }));
    const scene = {
      camera: { projection: "orthographic", position: [0, 0, 6], size: 3 },
      nodes: stripes,
    };
    const capture = (nodes: any[]) => {
      r.render({ ...scene, nodes });
      const bytes = new Uint8Array(r.canvas.width * r.canvas.height * 4);
      gl.readPixels(
        0,
        0,
        r.canvas.width,
        r.canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        bytes,
      );
      return bytes;
    };
    const background = capture(stripes),
      opaque = capture([
        ...stripes,
        { ...body, material: { color: "#eeeeee", transmission: 0 } },
      ]),
      glass = capture([...stripes, body]);
    let refracted = 0,
      transmitted = 0,
      opaqueNeutral = 0;
    const w = r.canvas.width,
      h = r.canvas.height;
    for (let y = Math.floor(h * 0.42); y < h * 0.58; y++)
      for (let x = Math.floor(w * 0.22); x < w * 0.78; x++) {
        const i = (y * w + x) * 4;
        if (Math.abs(glass[i] - glass[i + 2]) > 70) transmitted++;
        if (
          (glass[i] - glass[i + 2]) * (background[i] - background[i + 2]) <
          -1000
        )
          refracted++;
        if (Math.abs(opaque[i] - opaque[i + 2]) < 2) opaqueNeutral++;
      }
    const paper = capture([body]);
    const originalBackground = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = "transparent";
    document.documentElement.append(host);
    host.style.backgroundColor = "transparent";
    const automatic = capture([body]);
    const transparentHostMatchesPaper = paper.every(
      (v, i) => v === automatic[i],
    );
    document.documentElement.style.backgroundColor = originalBackground;
    r.destroy();
    host.remove();
    return {
      refracted,
      transmitted,
      opaqueNeutral,
      transparentHostMatchesPaper,
    };
  }, process.cwd());
  expect(results.transparentHostMatchesPaper).toBe(true);
  expect(results.transmitted).toBeGreaterThan(1000);
  expect(results.refracted).toBeGreaterThan(100);
  expect(results.opaqueNeutral).toBeGreaterThan(1000);
});

test("Studio 3D eyes follow the pointer in all four screen directions", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.getByRole("button", { name: "新建宠物", exact: true }).click();
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(page.locator("#avatar canvas")).toBeVisible();
  const root = process.cwd();
  await page.evaluate(async (root) => {
    const { model } = await import(
      performance
        .getEntriesByType("resource")
        .find((entry) => entry.name.includes("/src/model.ts"))!.name
    );
    model.playing = false;
    model.time = 0;
  }, root);
  const stage = page.locator("#stage"),
    r = (await stage.boundingBox())!;
  const eyeCenter = async () => {
    const png = PNG.sync.read(await stage.screenshot());
    let x = 0,
      y = 0,
      n = 0;
    for (let py = Math.floor(png.height * 0.2); py < png.height * 0.75; py++)
      for (let px = Math.floor(png.width * 0.2); px < png.width * 0.8; px++) {
        const i = (py * png.width + px) * 4;
        if (
          png.data[i] < 100 &&
          png.data[i + 1] < 110 &&
          png.data[i + 2] < 100
        ) {
          x += px;
          y += py;
          n++;
        }
      }
    expect(n).toBeGreaterThan(20);
    return { x: x / n, y: y / n };
  };
  const move = async (x: number, y: number) => {
    await page.mouse.move(r.x + r.width * x, r.y + r.height * y);
    await page.evaluate(async (root) => {
      const { model } = await import(
        performance
          .getEntriesByType("resource")
          .find((entry) => entry.name.includes("/src/model.ts"))!.name
      );
      model.time += 0.5;
      model.notifyPlayback();
    }, root);
    return eyeCenter();
  };
  const left = await move(0.1, 0.5),
    right = await move(0.9, 0.5),
    up = await move(0.5, 0.1),
    down = await move(0.5, 0.9);
  expect(right.x - left.x).toBeGreaterThan(20);
  expect(down.y - up.y).toBeGreaterThan(20);
});

test("soft shadows fade continuously and jelly composites premultiplied colors without dark borders", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const result = await page.evaluate(async (root) => {
    const { createWebGLRenderer } = await import(
      "/@fs" + root + "/packages/core/src/webgl.ts"
    );
    const { createSpatialPetScene } = await import(
      "/@fs" + root + "/packages/grove/src/rigs/spatial/index.ts"
    );
    const { ellipsoid3D } = await import(
      "/@fs" + root + "/packages/core/src/scene3d.ts"
    );
    const host = document.createElement("div");
    host.style.cssText = "width:320px;height:320px;background:white";
    document.body.append(host);
    const r = createWebGLRenderer(host),
      gl = r.canvas.getContext("webgl")!;
    const shadow = createSpatialPetScene().nodes.find(
      (n: any) => n.id === "shadow",
    )!;
    // White over white must remain white, even through a partially transparent background sample.
    const disc = {
      ...shadow,
      transform: undefined,
      material: { color: "#ffffff", unlit: true, radialOpacity: 0.5 },
    };
    const camera = { projection: "orthographic", position: [0, 0, 6], size: 4 };
    r.render({ camera, nodes: [disc] });
    const alpha = [];
    for (const x of [0.5, 0.6, 0.7, 0.8]) {
      const p = new Uint8Array(4);
      gl.readPixels(
        Math.floor(r.canvas.width * x),
        Math.floor(r.canvas.height * 0.5),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        p,
      );
      alpha.push(p[3]);
    }
    r.render({
      camera,
      nodes: [
        { ...disc, transform: { position: [0, 0, -1] } },
        {
          id: "glass",
          geometry: ellipsoid3D([1, 1, 0.5]),
          material: { color: "#ffffff", transmission: 1, unlit: true },
        },
      ],
    });
    const pixels = new Uint8Array(r.canvas.width * r.canvas.height * 4);
    gl.readPixels(
      0,
      0,
      r.canvas.width,
      r.canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let minimum = 255;
    for (let y = 0.4 * r.canvas.height; y < 0.6 * r.canvas.height; y++)
      for (let x = 0.4 * r.canvas.width; x < 0.6 * r.canvas.width; x++) {
        const i = (Math.floor(y) * r.canvas.width + Math.floor(x)) * 4;
        minimum = Math.min(minimum, pixels[i], pixels[i + 1], pixels[i + 2]);
      }
    r.destroy();
    host.remove();
    return { alpha, minimum };
  }, process.cwd());
  expect(result.alpha[0]).toBeGreaterThan(result.alpha[1]);
  expect(result.alpha[1]).toBeGreaterThan(result.alpha[2]);
  expect(result.alpha[2]).toBeGreaterThan(result.alpha[3]);
  expect(result.alpha[3]).toBe(0);
  expect(result.minimum).toBeGreaterThanOrEqual(254);
});

test("jelly scatters arbitrary background geometry while preserving sharp foreground geometry", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const result = await page.evaluate(async (root) => {
    const { createWebGLRenderer } = await import(
      "/@fs" + root + "/packages/core/src/webgl.ts"
    );
    const { ellipsoid3D, box3D } = await import(
      "/@fs" + root + "/packages/core/src/scene3d.ts"
    );
    const host = document.createElement("div");
    host.style.cssText = "width:360px;height:360px;background:#ffffff";
    document.body.append(host);
    const r = createWebGLRenderer(host),
      gl = r.canvas.getContext("webgl")!;
    const bars = Array.from({ length: 31 }, (_, i) => ({
      id: "bar-" + i,
      geometry: box3D([0.055, 1.6, 0.04]),
      material: { color: i % 2 ? "#ffffff" : "#172a44", unlit: true },
      transform: { position: [(i - 15) * 0.055, 0, -1.2] },
    }));
    const marker = {
      id: "foreground-marker",
      geometry: box3D([0.25, 0.25, 0.05]),
      material: { color: "#ed2345", unlit: true },
      transform: { position: [0.38, 0.32, 1] },
    };
    const body = {
      id: "jelly",
      geometry: ellipsoid3D([0.95, 0.95, 0.65], 64, 32),
      material: { color: "#b1decd", transmission: 0.95 },
    };
    const camera = { projection: "orthographic", position: [0, 0, 6], size: 3 };
    const pixels = (roughness: number, extra: any[] = []) => {
      r.render({
        camera,
        nodes: [
          ...bars,
          marker,
          ...extra,
          {
            ...body,
            material: { ...body.material, transmissionRoughness: roughness },
          },
        ],
      });
      const data = new Uint8Array(r.canvas.width * r.canvas.height * 4);
      gl.readPixels(
        0,
        0,
        r.canvas.width,
        r.canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data,
      );
      return data;
    };
    const clear = pixels(0),
      frosted = pixels(0.8),
      w = r.canvas.width,
      h = r.canvas.height;
    const contrast = (data: Uint8Array) => {
      let total = 0;
      for (let x = Math.floor(w * 0.35); x < w * 0.65; x++) {
        const i = (Math.floor(h * 0.5) * w + x) * 4;
        total += Math.abs(data[i] - data[i + 4]);
      }
      return total;
    };
    const markerPixel = (data: Uint8Array) => {
      const i =
        (Math.floor(h * (0.5 + 0.32 / 3)) * w +
          Math.floor(w * (0.5 + 0.38 / 3))) *
        4;
      return [...data.slice(i, i + 4)];
    };
    // One object crosses the jelly: its left half is behind, its right half in front.
    const crossing = {
      id: "crossing-ribbon",
      geometry: box3D([1.5, 0.16, 0.05]),
      material: { color: "#ff0010", unlit: true },
      transform: { position: [0, -0.35, 0.3], rotation: [0, -0.9, 0] },
    };
    const crossed = pixels(0.8, [crossing]);
    let behindChanged = 0,
      frontRed = 0;
    for (let y = Math.floor(h * 0.35); y < h * 0.43; y++)
      for (let x = Math.floor(w * 0.32); x < w * 0.48; x++) {
        const i = (y * w + x) * 4;
        if (crossed[i] - frosted[i] > 15) behindChanged++;
      }
    for (let y = Math.floor(h * 0.35); y < h * 0.43; y++)
      for (let x = Math.floor(w * 0.59); x < w * 0.65; x++) {
        const i = (y * w + x) * 4;
        if (crossed[i] > 250 && crossed[i + 1] < 3) frontRed++;
      }
    const error = gl.getError();
    r.destroy();
    host.remove();
    return {
      clear: contrast(clear),
      frosted: contrast(frosted),
      clearMarker: markerPixel(clear),
      frostedMarker: markerPixel(frosted),
      behindChanged,
      frontRed,
      error,
    };
  }, process.cwd());
  expect(result.frosted).toBeLessThan(result.clear * 0.55);
  expect(result.clearMarker).toEqual([237, 35, 69, 255]);
  expect(result.frostedMarker).toEqual(result.clearMarker);
  expect(result.behindChanged).toBeGreaterThan(20);
  expect(result.frontRed).toBeGreaterThan(20);
  expect(result.error).toBe(0);
});

test("closed 3D eyes render without errors in WebGL", async ({ page }) => {
  await page.goto("http://127.0.0.1:14517/spatial.html");
  const result = await page.evaluate(async (root) => {
    const { createSpatialPetScene } = await import(
      "/@fs" + root + "/packages/grove/src/rigs/spatial/index.ts"
    );
    const { createSpatialRenderer } = await import(
      "/@fs" + root + "/packages/core/src/spatial-browser.ts"
    );
    let count = 0;
    for (const mode of ["webgl"] as const) {
      const host = document.createElement("div");
      host.style.cssText = "width:300px;height:300px";
      document.body.append(host);
      const renderer = createSpatialRenderer(host);
      for (const shape of [0, 1, 2])
        for (const expression of [0, 18])
          for (const time of [3.84, 3.9, 3.98]) {
            renderer.render(createSpatialPetScene({ shape, expression, time }));
            count++;
          }
      renderer.destroy();
      host.remove();
    }
    return count;
  }, process.cwd());
  expect(result).toBe(18);
});
