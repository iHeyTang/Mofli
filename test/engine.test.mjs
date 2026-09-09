import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RigRegistry,
  validateBehavior,
  greeting,
  celebration,
  blendFrames,
} from "@mofli/core";
import { testRig, bloubRig, presets } from "./fixtures/presets.mjs";
test("an interrupted transition starts at the exact visible frame", () => {
  const e = new PetEngine(testRig, presets[0]);
  for (let i = 0; i < 40; i++) {
    const t = 1 + i * 0.025,
      before = e.sample(t);
    e.setSkin(presets[i % 3], t);
    assert.deepEqual(e.sample(t), before);
    const middle = e.sample(t + 0.01);
    e.sample(t + 20);
    assert.deepEqual(e.sample(t + 0.01), middle);
  }
});
test("discrete expressions and skin color interpolate and complete", () => {
  const e = new PetEngine(testRig, presets[0]);
  const before = e.sample(1);
  e.handle({ type: "mood", value: "happy" }, 1);
  assert.deepEqual(e.sample(1), before);
  const fresh = new PetEngine(testRig, presets[0]);
  fresh.handle({ type: "mood", value: "happy" }, 0);
  assert.deepEqual(e.sample(2), fresh.sample(2));
  e.setSkin(presets[1], 3);
  assert.notEqual(
    e.sample(3.1).shapes.find((s) => s.id === "body").attrs.fill,
    presets[1].colors.body,
  );
  assert.equal(
    e.sample(4).shapes.find((s) => s.id === "body").attrs.fill,
    presets[1].colors.body,
  );
  assert.throws(() => e.handle({ type: "tap" }, 2), /monotonic/);
});
test("behaviors validate capabilities, priorities, interruption and direct manipulation", () => {
  for (const rig of [testRig]) {
    const e = new PetEngine(
      rig,
      presets.find((s) => s.rig === rig.id),
    );
    assert.equal(e.play(celebration, 0), true);
    assert.equal(e.play(greeting, 0.1), false);
    assert.ok(e.sample(0.3).bounds.y < e.sample(2).bounds.y - 10);
    const before = e.sample(0.4);
    e.handle({ type: "press", value: true }, 0.4);
    assert.deepEqual(e.sample(0.4), before);
    assert.equal(e.play(greeting, 0.5), false);
    e.handle({ type: "press", value: false }, 0.6);
    assert.equal(e.play(greeting, 0.7), true);
    const stopped = e.sample(0.8);
    e.stop(0.8);
    assert.deepEqual(e.sample(0.8), stopped);
  }
  for (const clip of [
    { ...greeting, duration: NaN },
    { ...greeting, tracks: { missing: greeting.tracks.lift } },
    {
      ...greeting,
      tracks: {
        lift: [
          { at: 0, value: 0 },
          { at: 0.9, value: 2 },
        ],
      },
    },
  ])
    assert.throws(() => validateBehavior(clip, testRig));
});
test("registry isolates definitions and rejects duplicate or incompatible extensions", () => {
  const r = new RigRegistry().register(testRig);
  assert.throws(() => r.register(testRig));
  assert.throws(() => r.resolve(presets[3]));
  const entry = r.get("test-rectangle");
  entry.parameters.width.max = 100;
  assert.equal(r.get("test-rectangle").parameters.width.max, 155);
  assert.equal(r.create(presets[0]).getSkin().id, "test-base");
  assert.throws(() =>
    r.register({
      ...testRig,
      channels: { bad: { min: 1, max: 0, default: 0 } },
    }),
  );
});
test("preparation happens at skin boundaries, rejected binding preserves current pet", () => {
  let calls = 0;
  const rig = {
    ...testRig,
    prepare(skin) {
      calls++;
      if (skin.id === "test-copper") throw new Error("unsupported binding");
      return testRig.prepare?.(skin);
    },
  };
  const e = new PetEngine(rig, presets[0]);
  for (let i = 0; i < 100; i++) e.sample(i);
  assert.equal(calls, 1);
  assert.throws(() => e.setSkin(presets[1], 1));
  assert.equal(e.getSkin().id, "test-base");
});
test("topology changes crossfade without invalid geometry or duplicate IDs", () => {
  const base = { anchors: [], bounds: { x: 0, y: 0, width: 10, height: 10 } };
  let a = {
    ...base,
    shapes: [
      {
        id: "body",
        kind: "path",
        attrs: { d: "M 0 0 L 1 1", fill: "#000000" },
      },
    ],
  };
  const b = {
    ...base,
    shapes: [
      {
        id: "body",
        kind: "ellipse",
        attrs: { cx: 1, cy: 1, rx: 1, ry: 1, fill: "#FFFFFF" },
      },
    ],
  };
  for (let i = 0; i < 20; i++) {
    a = blendFrames(a, b, 0.1);
    assert.equal(new Set(a.shapes.map((s) => s.id)).size, a.shapes.length);
    assert.ok(!JSON.stringify(a).includes("NaN"));
  }
  assert.deepEqual(blendFrames(a, b, 1), b);
});
