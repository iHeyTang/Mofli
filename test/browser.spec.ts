import { test, expect } from "@playwright/test";
test("public renderer and external rig work without the studio UI", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const root = process.cwd();
  const result = await page.evaluate(async (root) => {
    const { createSvgRenderer, createPet } = await import(
      "/@fs" + root + "/packages/core/src/browser.ts"
    );
    const { RigRegistry } = await import(
      "/@fs" + root + "/packages/core/src/index.ts"
    );
    const host = document.createElement("div"),
      marker = document.createElement("span");
    host.append(marker);
    document.body.append(host);
    const rig = {
      id: "external",
      version: 1,
      name: "External",
      parameters: {},
      colors: { ink: "#123456" },
      sample: () => ({
        shapes: [
          {
            id: "one",
            kind: "ellipse",
            attrs: { cx: 160, cy: 160, rx: 20, ry: 20, fill: "#123456" },
          },
        ],
        anchors: [],
        bounds: { x: 140, y: 140, width: 40, height: 40 },
      }),
    };
    const skin = {
      version: 1,
      id: "external-skin",
      name: "External",
      rig: "external",
      colors: {},
    };
    const engine = new RigRegistry().register(rig).create(skin);
    const renderer = createSvgRenderer(host);
    renderer.render(engine.sample(0));
    const node = renderer.svg.querySelector("ellipse");
    renderer.render(engine.sample(1));
    const reused = node === renderer.svg.querySelector("ellipse");
    renderer.destroy();
    renderer.destroy();
    const pet = createPet({ container: host, rig, skin });
    pet.destroy();
    pet.destroy();
    const clean = host.children.length === 1 && host.firstChild === marker;
    host.remove();
    return { reused, clean };
  }, root);
  expect(result).toEqual({ reused: true, clean: true });

});

test("renderer applies typed matrices, removes stale ones and rejects invalid transforms atomically", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:14517/reference.html");
  const result = await page.evaluate(async (root) => {
    const { createSvgRenderer } = await import(
      "/@fs" + root + "/packages/core/src/browser.ts"
    );
    const host = document.createElement("div");
    document.body.append(host);
    const r = createSvgRenderer(host);
    const f = {
      bounds: { x: 0, y: 0, width: 320, height: 320 },
      anchors: [],
      shapes: [
        {
          id: "eye",
          kind: "ellipse",
          attrs: { cx: 0, cy: 0, rx: 5, ry: 10, fill: "#123456" },
          transform: [0.6, 0.1, 0, 1, 160, 150],
        },
      ],
    };
    r.render(f);
    const node = r.svg.querySelector("ellipse");
    const matrix = node.getAttribute("transform");
    let rejected = false;
    try {
      r.render({
        ...f,
        shapes: [{ ...f.shapes[0], transform: [NaN, 0, 0, 1, 0, 0] }],
      });
    } catch {
      rejected = true;
    }
    const preserved = node.getAttribute("transform") === matrix;
    r.render({
      ...f,
      shapes: [
        {
          id: "eye",
          kind: "ellipse",
          attrs: { ...f.shapes[0].attrs, cx: 160, cy: 150 },
        },
      ],
    });
    const cleared = !node.hasAttribute("transform");
    r.destroy();
    host.remove();
    return { matrix, rejected, preserved, cleared };
  }, process.cwd());
  expect(result).toEqual({
    matrix: "matrix(0.6 0.1 0 1 160 150)",
    rejected: true,
    preserved: true,
    cleared: true,
  });

});
