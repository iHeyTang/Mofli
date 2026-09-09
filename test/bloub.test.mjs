import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { bloubSkin } from "@mofli/grove/skins/bloub";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bloubRig,
  bloubStates,
  bloubDuration,
  bloubFrame,
} from "@mofli/grove/rigs/bloub";
import { BotEngine } from "../packages/grove/dist/rigs/bloub/vendor/engine.js";
test("all 14 isolated states preserve upstream geometry and resources", () => {
  for (const state of bloubStates) {
    const engine = new PetEngine(bloubRig, {
        ...bloubSkin,
        parameters: { state: state.index },
      }),
      reference = new BotEngine(100, state.id);
    for (let t = 0; t < state.duration; t += 0.033) {
      assert.deepEqual(engine.sample(t), bloubFrame(reference.sample(t)));
      assert.ok(!/NaN|Infinity/.test(JSON.stringify(engine.sample(t))));
    }
  }
});
test("automatic playback agrees with upstream sequential engine across two complete cycles", () => {
  const engine = new PetEngine(bloubRig, bloubSkin),
    reference = new BotEngine(100, "idle");
  let index = 0,
    next = bloubStates[0].duration;
  for (let t = 0; t < bloubDuration * 2; t += 0.016) {
    while (t >= next) {
      index = (index + 1) % 14;
      reference.setState(bloubStates[index].id, next);
      next += bloubStates[index].duration;
    }
    assertFramesClose(engine.sample(t), bloubFrame(reference.sample(t)));
  }
});
test("reference supports random access, reduced motion, new state local time and export colors", () => {
  const engine = new PetEngine(bloubRig, bloubSkin);
  const a = engine.sample(12);
  engine.sample(90);
  assert.deepEqual(engine.sample(12), a);
  assert.deepEqual(engine.sample(3, true), engine.sample(8, true));
  engine.setSkin({ ...bloubSkin, parameters: { state: 11 } }, 100);
  const orbit = new BotEngine(100, "orbit");
  orbit.reset("orbit", 100);
  assert.deepEqual(engine.sample(101), bloubFrame(orbit.sample(101)));
  assert.throws(
    () => new PetEngine(bloubRig, { ...bloubSkin, parameters: { state: 1.5 } }),
  );
});

function assertFramesClose(a, b, path = "") {
  if (typeof a === "number" && typeof b === "number") {
    assert.ok(Math.abs(a - b) < 1e-8, `${path}: ${a} vs ${b}`);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    assert.deepEqual(Object.keys(a), Object.keys(b), path);
    for (const key of Object.keys(a))
      assertFramesClose(a[key], b[key], path + "." + key);
    return;
  }
  // Upstream rounds path/matrix coordinates to 0.01; event-time roundoff may
  // land on opposite sides of a rounding boundary. Bound error to one quantum.
  if (
    typeof a === "string" &&
    typeof b === "string" &&
    a !== b &&
    (path.endsWith(".d") || path.endsWith(".matrix"))
  ) {
    const re = /-?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?/gi;
    assert.equal(a.replace(re, "#"), b.replace(re, "#"));
    const av = a.match(re).map(Number),
      bv = b.match(re).map(Number);
    for (let i = 0; i < av.length; i++)
      assert.ok(Math.abs(av[i] - bv[i]) <= 0.010001, path);
    return;
  }
  assert.deepEqual(a, b, path);
}

test("all 196 manual state pairs use upstream pose morphs, including interrupted transitions", () => {
  const skinFor = (s) => ({ ...bloubSkin, parameters: { state: s.index } });
  for (const from of bloubStates)
    for (const to of bloubStates) {
      const engine = new PetEngine(bloubRig, skinFor(from), {
        transitionDuration: 0.45,
      });
      const oracle = new BotEngine(100, from.id);
      engine.setSkin(skinFor(to), 1);
      oracle.setState(to.id, 1);
      for (const t of [1, 1.016, 1.05, 1.12, 1.24, 1.5, 2])
        assertFramesClose(engine.sample(t), bloubFrame(oracle.sample(t)));
      // Redirect a morph at 70 ms, then redirect again at 100 ms.
      for (const [index, time] of [
        [(to.index + 3) % 14, 1.07],
        [(to.index + 8) % 14, 1.1],
      ]) {
        const state = bloubStates[index];
        engine.setSkin(skinFor(state), time);
        oracle.setState(state.id, time);
        for (const t of [time, time + 0.016, time + 0.04])
          assertFramesClose(engine.sample(t), bloubFrame(oracle.sample(t)));
      }
      const frozen = engine.sample(1.13);
      engine.sample(8);
      assert.deepEqual(engine.sample(1.13), frozen);
    }
});

test("automatic/manual handoff retains pose clock and recoloring retains the active morph", () => {
  const engine = new PetEngine(bloubRig, bloubSkin);
  const oracle = new BotEngine(100, "idle");
  let at = 0;
  for (let i = 1; i <= 4; i++) {
    at += bloubStates[i - 1].duration;
    oracle.setState(bloubStates[i].id, at);
  }
  at += 0.2;
  const skin = { ...bloubSkin, parameters: { state: 5 } };
  engine.setSkin(skin, at);
  oracle.setState("notify", at);
  assertFramesClose(
    engine.sample(at + 0.05),
    bloubFrame(oracle.sample(at + 0.05)),
  );
  engine.setSkin(
    { ...skin, colors: { body: "#123456", paper: "#ffffff" } },
    at + 0.06,
    { restart: false },
  );
  assertFramesClose(
    engine.sample(at + 0.1),
    bloubFrame(oracle.sample(at + 0.1), "#123456", "#ffffff"),
  );
  at += 0.12;
  engine.setSkin(bloubSkin, at);
  oracle.setState("idle", at);
  let next = at + bloubStates[0].duration,
    index = 0;
  for (let t = at; t < at + bloubDuration * 1.2; t += 0.057) {
    while (t >= next) {
      index = (index + 1) % 14;
      oracle.setState(bloubStates[index].id, next);
      next += bloubStates[index].duration;
    }
    assertFramesClose(engine.sample(t), bloubFrame(oracle.sample(t)));
  }
});

test("alert tear preserves subpixel precision before its 100x decoration scale", async () => {
  const { hullOfCircles } =
    await import("../packages/grove/dist/rigs/bloub/vendor/shape.js");
  const dot = new BotEngine(100, "alert").sample(0.75).dots.find((d) => d.d);
  const coordinates = dot.d.match(/-?(?:\d*\.\d+|\d+)/g).map(Number);
  const expected = hullOfCircles(0, 0, 0.118, 0, 0.172, 0.012).flatMap((p) => [
    p.x,
    p.y,
  ]);
  assert.equal(coordinates.length, expected.length);
  // Less than 0.0001 viewBox unit error after scale; old rounding introduced up to 0.5.
  coordinates.forEach((v, i) =>
    assert.ok(Math.abs(v - expected[i]) * 100 <= 0.000051),
  );
});
