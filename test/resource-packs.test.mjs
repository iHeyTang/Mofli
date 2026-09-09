import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defineResourcePack,
  collectResourcePacks,
  PetRegistry,
  defineAttachment,
} from "@mofli/core";
import { bloubRig } from "@mofli/grove/rigs/bloub";
import { mewRig } from "@mofli/grove/rigs/mew";
import { doughSkin } from "@mofli/grove/skins/mofli-dough";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { accessoryPack } from "@mofli/grove/accessories";
import { scaffold } from "../apps/studio/bin/scaffold.mjs";
const mixed = defineResourcePack({
  id: "mixed",
  version: 1,
  rigs: [bloubRig, mewRig],
  skins: [doughSkin, sesame],
  attachments: accessoryPack.attachments,
});
test("one mixed pack registers multiple rigs, skins and accessories and renders both rigs", () => {
  const r = collectResourcePacks([mixed]);
  assert.equal(r.rigs.length, 2);
  assert.equal(r.skins.length, 2);
  assert.equal(r.attachments.length, 20);
  const registry = new PetRegistry().registerPacks(mixed);
  for (const skin of r.skins)
    assert.ok(
      registry
        .create({
          version: 1,
          skin,
          rigConfig: {},
          pose: {},
          attachments: [{ id: "sprout", type: "sprout", version: 1 }],
        })
        .sample(1).shapes.length,
    );
});
test("cross-pack skin bindings are independent of package order and fail atomically on conflicts", () => {
  const skinPack = { id: "skins", version: 1, skins: [doughSkin] },
    rigPack = { id: "rigs", version: 1, rigs: [bloubRig] };
  assert.equal(collectResourcePacks([skinPack, rigPack]).skins.length, 1);
  assert.throws(() => collectResourcePacks([skinPack]), /Rig not installed/);
  const registry = new PetRegistry().registerPacks(rigPack);
  assert.throws(
    () =>
      registry.registerPacks({
        id: "bad",
        version: 1,
        rigs: [mewRig, { ...bloubRig, name: "conflict" }],
      }),
    /Conflicting/,
  );
  assert.throws(
    () =>
      registry.create({
        version: 1,
        skin: sesame,
        rigConfig: {},
        pose: {},
        attachments: [],
      }),
    /Rig not installed/,
  );
  assert.throws(
    () => collectResourcePacks([rigPack, rigPack]),
    /Duplicate pack/,
  );
});
test("all twenty bundled accessory definitions roundtrip as pure JSON and resolve numeric animation channels", async () => {
  const files = readdirSync("packages/grove/src/accessories/data");
  assert.equal(files.length, 20);
  for (const file of files) {
    const definition = JSON.parse(
      readFileSync("packages/grove/src/accessories/data/" + file),
    );
    assert.equal(typeof definition.scene, "object");
    const { definition: typed } = await import(
      "@mofli/grove/accessories/" + file.replace(".json", "")
    );
    assert.deepEqual(typed, definition);
    const part = defineAttachment(definition),
      registry = new PetRegistry()
        .registerRig(bloubRig)
        .registerAttachment(part);
    const pet = registry.create({
      version: 1,
      skin: doughSkin,
      rigConfig: {},
      pose: {},
      attachments: [{ id: part.id, type: part.id, version: 1 }],
    });
    for (const t of [0, 0.75, 2])
      assert.ok(!/NaN|Infinity/.test(JSON.stringify(pet.sample(t))));
  }
});
test("numeric channels reject prototype writes, cycles and nonfinite outputs", () => {
  const base = {
    id: "test",
    mount: "head.forehead",
    slot: "head.overlay",
    scene: {
      version: 1,
      nodes: [
        {
          id: "dot",
          geometry: { kind: "ellipse", cx: 0, cy: 0, rx: 0.1, ry: 0.1 },
          attrs: { fill: "#aaa" },
        },
      ],
    },
  };
  const ctx = {
    time: 1,
    project: ([x, y, z]) => ({ x, y, depth: z }),
    surface: ([x, y]) => ({ x, y, depth: 0 }),
  };
  for (const scene of [
    {
      ...base.scene,
      channels: [{ path: ["nodes", "__proto__", "x"], value: 1 }],
    },
    {
      ...base.scene,
      variables: { a: { variable: "a" } },
      channels: [
        { path: ["nodes", 0, "geometry", "cx"], value: { variable: "a" } },
      ],
    },
    {
      ...base.scene,
      channels: [
        {
          path: ["nodes", 0, "geometry", "cx"],
          value: { op: "div", args: [1, 0] },
        },
      ],
    },
  ])
    assert.throws(() => defineAttachment({ ...base, scene }).sample(ctx, {}));
});
test("CLI scaffolds one mixed resource npm package and Studio consumes its pack", () => {
  const root = mkdtempSync(join(tmpdir(), "mofli-mixed-"));
  try {
    const dir = scaffold(join(root, "my-pack"), { type: "pack" });
    assert.match(
      readFileSync(join(dir, "src/index.ts"), "utf8"),
      /rigs:\[bloubRig,mewRig\]/,
    );
    assert.match(
      readFileSync(join(dir, "mofli.project.ts"), "utf8"),
      /packs:\[pack\]/,
    );
    assert.deepEqual(
      Object.keys(
        JSON.parse(readFileSync(join(dir, "package.json"))).peerDependencies,
      ),
      ["@mofli/core", "@mofli/grove"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

 test("Grove resource metadata uses English labels", async () => {
  const { grovePack } = await import("@mofli/grove");
  assert.equal(grovePack.id, "mofli.grove");
  assert.doesNotMatch(JSON.stringify(grovePack), /\p{Script=Han}/u);
});
