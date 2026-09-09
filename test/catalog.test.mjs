import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bloubRig,
  shapeOptions,
  expressionOptions,
  colorOptions,
} from "@mofli/grove/rigs/bloub";
import { catHeadRig } from "@mofli/grove/rigs/cat-head";
import { bloubSkin } from "@mofli/grove/skins/bloub";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
const catSkins = [sesame, patches];
test("complete shape and expression catalogs render across both rigs", () => {
  assert.equal(shapeOptions.length, 11);
  assert.equal(expressionOptions.length, 18);
  assert.equal(colorOptions.length, 12);
  for (const [rig, skin] of [
    [bloubRig, bloubSkin],
    [catHeadRig, catSkins[0]],
  ]) {
    const silhouettes = new Set();
    for (const shape of shapeOptions.filter(s => rig === bloubRig || s.index < 8)) {
      for (const expression of expressionOptions.filter(e=>rig===bloubRig || e.index<17)) {
        const e = new PetEngine(rig, {
          ...skin,
          parameters: {
            ...skin.parameters,
            state: 0,
            shape: shape.index,
            expression: expression.index,
          },
        });
        const frame = e.sample(1);
        assert.ok(!/NaN|Infinity/.test(JSON.stringify(frame)));
        if (expression.index === 0)
          silhouettes.add(frame.resources[0].shapes[0].attrs.d);
      }
    }
    assert.equal(silhouettes.size, rig === bloubRig ? 11 : 8);
    assert.throws(
      () =>
        new PetEngine(rig, {
          ...skin,
          parameters: { ...skin.parameters, shape: 0.5 },
        }),
    );
  }
});
