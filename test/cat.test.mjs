import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PoseController, transformPoint } from "@mofli/core";
import { blend, toPoints } from "@mofli/core/radial";
import { mewRig, catStates } from "@mofli/grove/rigs/mew";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
const catSkins = [sesame, patches];
import { BotEngine as CatEngine } from "../packages/grove/dist/rigs/mew/vendor/engine.js";
import { masterProfile } from "../packages/grove/dist/rigs/mew/soft-master.js";
import { bloubStates } from "@mofli/grove/rigs/bloub";
import { BotEngine } from "../packages/grove/dist/rigs/bloub/vendor/engine.js";
// Upstream decor prefixes resource ids when freezing a transition; compare
// rendered geometry and references, independent of those internal names.
function visible(frame) {
  const f = structuredClone(frame),
    ids = new Map((f.resources ?? []).map((r, i) => [r.id, `r${i}`]));
  for (const [i, r] of (f.resources ?? []).entries()) {
    r.id = `r${i}`;
    for (const [j, s] of (r.shapes ?? []).entries()) s.id = `rs${j}`;
  }
  for (const [i, s] of f.shapes.entries()) {
    s.id = `s${i}`;
    if (s.mask) s.mask = ids.get(s.mask);
    if (s.paint)
      for (const k of Object.keys(s.paint)) s.paint[k] = ids.get(s.paint[k]);
  }
  return JSON.stringify(f);
}
test("98 Bloub frames retain their pre-extraction fingerprint", () => {
  const frames = bloubStates.slice(0, 14).map((s) =>
    [0, 0.03, 0.1, 0.3, 0.75, 1.3, 2].map((t) =>
      new BotEngine(100, s.id).sample(t),
    ),
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(frames)).digest("hex"),
    "f5946abc3b62873e2512cc8d5e517b48ec73d1f68c4462915b4f3349503ad40e",
  );
});
test("numeric pose redirection keeps the live source and captures interrupted motion", () => {
  const a = new PoseController((t) => ({ x: t, y: 2 * t }));
  const b = a.redirect((t) => ({ x: 10 + t, y: -t }), 1);
  assert.deepEqual(a.sample(1), b.sample(1));
  const c = b.redirect((t) => ({ x: 4 + t, y: t }), 1.1);
  assert.deepEqual(b.sample(1.1), c.sample(1.1));
  assert.deepEqual(c.sample(2), { x: 6, y: 2 });
  assert.deepEqual(c.sample(1.2), c.sample(1.2));
  assert.throws(() => c.redirect((t) => ({ x: t, y: t }), 0.5));
});
test("both cat skins preserve geometry on all state changes and rapid interruption", () => {
  for (const skin of catSkins)
    for (const from of catStates)
      for (const to of catStates) {
        const e = new PetEngine(mewRig, {
          ...skin,
          parameters: { ...skin.parameters, state: from.index },
        });
        const before = visible(e.sample(1));
        e.setSkin(
          { ...skin, parameters: { ...skin.parameters, state: to.index } },
          1,
        );
        assert.equal(visible(e.sample(1)), before);
        const mid = visible(e.sample(1.08));
        e.setSkin(
          {
            ...skin,
            parameters: {
              ...skin.parameters,
              state: (to.index + 2) % catStates.length,
            },
          },
          1.08,
        );
        assert.equal(visible(e.sample(1.08)), mid);
        for (const t of [1.08, 1.1, 1.2, 1.8, 4])
          assert.ok(!/NaN|Infinity/.test(visible(e.sample(t))));
      }
});

test("fourteen states use the selected soft master and reference animation", () => {
  assert.deepEqual(
    catStates.map((s) => s.id),
    bloubStates.map((s) => s.id),
  );
  for (const skin of catSkins)
    for (const state of catStates) {
      const e = new PetEngine(mewRig, {
        ...skin,
        parameters: { ...skin.parameters, state: state.index },
      });
      for (const t of [0, 0.1, 0.5, state.posterTime, 2]) {
        const f = e.sample(t),
          source = new CatEngine(
            100,
            state.id,
            masterProfile(skin.rigConfig.earLength, skin.rigConfig.cheek),
          ).sample(t);
        assert.equal(
          f.resources.find((r) => r.id === "face-mask").shapes[0].attrs.d,
          source.bodyPath,
        );
        assert.equal(
          f.resources
            .find((r) => r.id === "face-mask")
            .shapes.filter((s) => s.id.startsWith("eye-")).length,
          source.eyes.length,
        );
        assert.ok(!/NaN|Infinity/.test(JSON.stringify(f)));
        for (const ear of f.shapes.filter((s) => s.id.startsWith("ear-")))
          assert.equal(ear.attrs.opacity, source.bodyAlpha);
      }
      assert.deepEqual(e.sample(0, true), e.sample(50, true));
    }
});
test("symbol states retract ears geometrically; changing skin keeps interrupted geometry", () => {
  for (const id of ["thinking", "alert", "exclaim", "sleep", "burst"]) {
    const f = new PetEngine(mewRig, {
      ...catSkins[0],
      parameters: {
        ...catSkins[0].parameters,
        state: catStates.find((s) => s.id === id).index,
      },
    }).sample(2);
    assert.ok(!f.shapes.some((s) => s.id.startsWith("ear-")));
    assert.equal(
      f.resources[0].shapes[0].attrs.d,
      new BotEngine(100, id).sample(2).bodyPath,
    );
  }
  const e = new PetEngine(mewRig, catSkins[0]);
  e.setSkin(
    { ...catSkins[0], parameters: { ...catSkins[0].parameters, state: 3 } },
    1,
  );
  const f = e.sample(1.1);
  e.setSkin(
    { ...{ ...catSkins[0], colors: { body: "#444444", face: "#ffffff" } }, parameters: { ...{ ...catSkins[0], colors: { body: "#444444", face: "#ffffff" } }.parameters, state: 3 } },
    1.1,
  );
  assert.deepEqual(e.sample(1.1), f);
});

test("head silhouette follows yaw with mirrored views and preserves the frontal master", async () => {
  const { turnedProfile } =
    await import("../packages/grove/dist/rigs/mew/head-turn.js");
  const p = masterProfile(45, 0),
    front = turnedProfile(p, 0, 0, 1),
    right = turnedProfile(p, 30, 0, 1),
    left = turnedProfile(p, -30, 0, 1);
  assert.deepEqual(front, p);
  assert.notDeepEqual(right, p);
  for (let i = 0; i < 64; i++)
    assert.ok(
      Math.abs(
        right[i] - p[i] - (left[(32 - i + 64) % 64] - p[(32 - i + 64) % 64]),
      ) < 1e-7,
    );
  assert.deepEqual(turnedProfile(p, 30, 10, 0), p);
  const e = new PetEngine(mewRig, {
    ...catSkins[0],
    parameters: { ...catSkins[0].parameters, state: 5 },
  });
  assert.notEqual(
    e.sample(1).resources[0].shapes[0].attrs.d,
    new PetEngine(mewRig, catSkins[0]).sample(1).resources[0].shapes[0]
      .attrs.d,
  );
});
