import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetRegistry } from '@mofli/core';
import { grovePack, companionActions, companionMotion } from '@mofli/grove';
import { bloubStates } from '@mofli/grove/rigs/bloub';
import { catStates } from '@mofli/grove/rigs/mew';
import { spatialActions, spatialRig, spatialSkins } from '@mofli/grove/rigs/spatial';
const finite = value => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (typeof value === 'string') assert.ok(!/NaN|Infinity/.test(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
};
test('each rig exposes at least sixty stable named actions and four per companion scene', () => {
  for (const catalog of [bloubStates, catStates, spatialActions]) {
    assert.ok(catalog.length >= 60);
    assert.equal(new Set(catalog.map(a => a.id)).size, catalog.length);
    for (const a of companionActions) assert.ok(catalog.some(c => c.id === a.id));
  }
  for (const scene of new Set(companionActions.map(a => a.scene)))
    assert.equal(companionActions.filter(a => a.scene === scene).length, 4);
});
test('all authored actions sample finite, distinct geometry on every rig and remain serializable', () => {
  const pack = { ...grovePack, rigs: [...grovePack.rigs, spatialRig], skins: [...grovePack.skins, ...spatialSkins] };
  const registry = new PetRegistry().registerPacks(pack);
  for (const rig of pack.rigs) {
    const skin = pack.skins.find(s => s.rig === rig.id);
    const signatures = new Set();
    for (let i = 0; i < companionActions.length; i++) {
      const spatial = rig.dimension === '3d';
      const pet = registry.create({ version: 1, skin, rigConfig: {}, pose: { state: i + (spatial ? 8 : 14) }, attachments: [] });
      const sample = t => spatial ? pet.sampleScene(t) : pet.sample(t);
      const frames = [.17, .7, 1.3].map(t => sample(t));
      frames.forEach(finite);
      signatures.add(JSON.stringify(frames));
      assert.deepEqual(sample(.7), sample(.7));
      assert.doesNotThrow(() => registry.create(JSON.parse(JSON.stringify(pet.exportConfig()))));
      const still = t => spatial ? pet.sampleScene(t, true) : pet.sample(t, true);
      assert.deepEqual(still(0), still(50));
    }
    assert.equal(signatures.size, 52, rig.id);
  }
});
test('motion stays bounded and continuous across every loop seam', () => {
  for (let i = 0; i < companionActions.length; i++) {
    const a = companionActions[i], before = companionMotion(i, a.duration - 1e-6), after = companionMotion(i, a.duration + 1e-6);
    for (const key of Object.keys(before)) assert.ok(Math.abs(before[key] - after[key]) < .001, `${a.id}: ${key}`);
    for (let t = 0; t < a.duration; t += .05) {
      const m = companionMotion(i, t);
      assert.ok(m.stretch > .6 && m.stretch < 1.4);
      assert.ok(m.y >= 0 && m.y < .6);
      assert.ok(Math.abs(m.x) <= .3);
    }
  }
});
