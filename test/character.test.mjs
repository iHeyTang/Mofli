import { test } from "node:test";
import assert from "node:assert/strict";
import { PetEngine, validateSkin } from "@mofli/core";
import { catHeadRig, defineCatSkin } from "@mofli/rig-cat-head";
import { sesame } from "@mofli/skin-cat-ink";
import { patches } from "@mofli/skin-cat-patches";

const biscuit = defineCatSkin({ id: "test-short", name: "Test configuration", rigConfig: { earLength: 35, cheek: 0.3 } });

test("skins own default geometry; swapping skins preserves runtime pose", () => {
  const e = new PetEngine(catHeadRig, sesame, {
    rigConfig: { earLength: 48 },
    pose: { state: 3, expression: 4 },
  });
  assert.equal(e.getRigConfig().earLength, 48);
  const pose = e.getPose();
  e.setSkin(biscuit, 1);
  assert.equal(e.getRigConfig().earLength, 35);
  assert.deepEqual(e.getPose(), pose);
  e.setRigConfig({ ...e.getRigConfig(), earLength: 40 }, 2);
  assert.equal(e.getSkin().rigConfig.earLength, 35);
  const exported = e.exportSkin();
  assert.equal(exported.rigConfig.earLength, 40);
  assert.equal("pose" in exported, false);
  assert.equal("state" in exported.rigConfig, false);
  const restored = new PetEngine(
    catHeadRig,
    JSON.parse(JSON.stringify(exported)),
  );
  assert.equal(restored.getRigConfig().earLength, 40);
  assert.equal(restored.getPose().state, 0);
  exported.rigConfig.earLength = 32;
  assert.equal(e.getRigConfig().earLength, 40);
  e.setSkin(defineCatSkin({ id: "plain", name: "Plain" }), 3);
  assert.equal(e.getRigConfig().earLength, 45);
  assert.deepEqual(e.getPose(), pose);
});

test("skin defaults obey rig constraints and cannot smuggle runtime state", () => {
  const e = new PetEngine(catHeadRig, sesame);
  const before = e.getCharacter();
  for (const rigConfig of [
    { earLength: 99 },
    { state: 1 },
    { expression: 2 },
    { unknown: 1 },
  ]) {
    assert.throws(() => validateSkin({ ...sesame, rigConfig }, catHeadRig));
    assert.throws(() => e.setSkin({ ...sesame, rigConfig }, 1));
    assert.deepEqual(e.getCharacter(), before);
  }
  assert.throws(() => e.setSkin({ ...sesame, rigConfig: { shape: 0.5 } }, 1));
  assert.deepEqual(e.getCharacter(), before);
  assert.throws(() => validateSkin({ ...sesame, parameters: {} }, catHeadRig));
  assert.equal("presets" in catHeadRig, false);
});
