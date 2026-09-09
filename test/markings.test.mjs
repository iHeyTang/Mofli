import { test } from "node:test";
import assert from "node:assert/strict";
import { PetEngine, validateSkin } from "@mofli/core";
import { catHeadRig, catStates } from "@mofli/rig-cat-head";
import { bloubRig } from "@mofli/rig-bloub";
import { sesame } from "@mofli/skin-cat-ink";
import { patches } from "@mofli/skin-cat-patches";
const marks = (f) => f.shapes.filter((s) => s.id.startsWith("mark-"));
test("one immutable pattern definition follows all states and shape choices", () => {
  const saved = JSON.stringify(patches);
  for (let shape = -1; shape < 8; shape++)
    for (const state of catStates) {
      const e = new PetEngine(catHeadRig, patches, {
        rigConfig: { shape },
        pose: { state: state.index },
      });
      for (const t of [0, 0.1, 0.4, 1, state.posterTime]) {
        const f = e.sample(t);
        assert.ok(!/NaN|Infinity/.test(JSON.stringify(f)));
        assert.equal(marks(f).length, 2);
        for (const mark of marks(f)) {
          assert.equal(mark.mask, "face-mask");
          assert.ok(mark.attrs.opacity >= 0 && mark.attrs.opacity <= 1);
        }
      }
      if (["thinking", "alert", "exclaim", "sleep", "burst"].includes(state.id))
        assert.ok(
          marks(e.sample(state.posterTime)).every((s) => s.attrs.opacity === 0),
        );
    }
  assert.equal(JSON.stringify(patches), saved);
  const idle = new PetEngine(catHeadRig, patches).sample(1);
  const turn = new PetEngine(catHeadRig, patches, {
    pose: { state: 3 },
  }).sample(1);
  assert.notEqual(marks(idle)[0].attrs.d, marks(turn)[0].attrs.d);
});
test("pattern appearance transitions can be interrupted without a jump", () => {
  const e = new PetEngine(catHeadRig, sesame);
  e.setSkin(patches, 1);
  const before = e.sample(1.12);
  e.setSkin(sesame, 1.12);
  assert.deepEqual(e.sample(1.12), before);
  const mid = e.sample(1.2);
  e.setSkin(patches, 1.2);
  assert.deepEqual(e.sample(1.2), mid);
  assert.deepEqual(e.exportSkin().markings, patches.markings);
});
test("skins cannot request unknown bindings or inject drawing code", () => {
  for (const change of [
    { slot: "unknown" },
    { color: "url(x)" },
    { opacity: 2 },
    { points: [{ x: 2, y: 0 }] },
    { d: "M0 0" },
  ])
    assert.throws(() =>
      validateSkin(
        { ...patches, markings: [{ ...patches.markings[0], ...change }] },
        catHeadRig,
      ),
    );
  assert.throws(() =>
    validateSkin(
      { ...patches, rig: bloubRig.id, colors: {}, rigConfig: {} },
      bloubRig,
    ),
  );
});
test("eye artwork changes without replacing skeletal projection or expression timing", () => {
  for (const state of catStates) {
    const a = new PetEngine(
      catHeadRig,
      { ...patches, variants: { eyes: "capsule" } },
      { pose: { state: state.index } },
    ).sample(state.posterTime);
    const b = new PetEngine(catHeadRig, patches, {
      pose: { state: state.index },
    }).sample(state.posterTime);
    const eyes = (f) =>
      f.resources[0].shapes.filter((s) => s.id.startsWith("eye-"));
    assert.deepEqual(
      eyes(a).map((s) => [s.transform, s.attrs.opacity]),
      eyes(b).map((s) => [s.transform, s.attrs.opacity]),
    );
  }
  assert.throws(() =>
    validateSkin({ ...patches, variants: { eyes: "script" } }, catHeadRig),
  );
  const e = new PetEngine(catHeadRig, patches);
  assert.deepEqual(e.exportSkin().variants, { eyes: "oval" });
});
