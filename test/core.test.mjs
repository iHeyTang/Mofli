import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSkin } from "@mofli/core";
import { testRig, bloubRig, presets } from "./fixtures/presets.mjs";
test("rejects incompatible, malformed, injected and out-of-range skins", () => {
  for (const change of [
    { rig: "other" },
    { version: 2 },
    { parameters: { width: Infinity } },
    { parameters: { width: 2 } },
    { colors: { body: "url(https://example.com)" } },
    { parameters: { unknown: 1 } },
    { script: "alert(1)" },
  ])
    assert.throws(() =>
      validateSkin({ ...presets[0], ...change }, testRig),
    );
});
test("defaults are completed; external data cannot mutate engine", () => {
  const s = { ...presets[0], parameters: {}, colors: {} };
  const e = new PetEngine(testRig, s);
  s.colors.body = "#FFFFFF";
  assert.equal(e.getSkin().colors.body, "#D7A689");
  const out = e.getSkin();
  out.colors.body = "#000000";
  assert.equal(e.getRigConfig().width, 128);
});
test("sampling is repeatable and all built-in poses stay finite", () => {
  for (const rig of [testRig, bloubRig])
    for (const skin of presets.filter((s) => s.rig === rig.id)) {
      const e = new PetEngine(rig, skin);
      const first = e.sample(0.4);
      e.sample(10);
      assert.deepEqual(e.sample(0.4), first);
      for (const activity of ["idle", "working", "waiting", "success"])
        for (const mood of ["calm", "curious", "happy"]) {
          e.handle({ type: "activity", value: activity }, 0);
          e.handle({ type: "mood", value: mood }, 0);
          e.handle({ type: "drag", value: { x: 1, y: -1 } }, 0);
          for (let t = 0; t < 5; t += 0.05) {
            const f = e.sample(t);
            assert.ok(!/NaN|Infinity/.test(JSON.stringify(f)));
            assert.equal(
              new Set(f.shapes.map((s) => s.id)).size,
              f.shapes.length,
            );
          }
        }
    }
});
test("external rig needs no built-in body or eye structure", () => {
  const rig = {
    id: "single-line",
    version: 1,
    name: "Line",
    parameters: {},
    colors: {},
    sample: () => ({
      shapes: [
        { id: "line", kind: "line", attrs: { x1: 0, y1: 0, x2: 1, y2: 1 } },
      ],
      anchors: [],
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    }),
  };
  const engine = new PetEngine(rig, {
    version: 1,
    id: "line",
    name: "Line",
    rig: rig.id,
    parameters: {},
    colors: {},
  });
  assert.equal(engine.sample(0).shapes[0].kind, "line");
});
test("invalid input preserves frame; reduced motion stops automatic movement", () => {
  const e = new PetEngine(testRig, presets[0]);
  const before = e.sample(0);
  e.handle({ type: "look", value: { x: NaN, y: 0 } }, 0);
  assert.deepEqual(e.sample(0), before);
  assert.throws(() => e.sample(NaN));
  assert.deepEqual(e.sample(1, true), e.sample(2, true));
});
