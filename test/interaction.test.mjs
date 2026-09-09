import { test } from "node:test";
import assert from "node:assert/strict";
import { PetEngine } from "@mofli/core";
import { mewRig } from "@mofli/grove/rigs/mew";
import { bloubRig } from "@mofli/grove/rigs/bloub";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
import { bloubSkin } from "@mofli/grove/skins/bloub";
for (const [rig, skin] of [
  [mewRig, sesame],
  [mewRig, patches],
  [bloubRig, bloubSkin],
]) {
  test(`${rig.id}/${skin.id}: gaze and transient click are rig-owned`, () => {
    const make = () =>
      new PetEngine(rig, skin, { pose: { state: 0 }, transitionDuration: 0 });
    const baseline = make(),
      left = make(),
      right = make();
    left.handle({ type: "look", value: { x: -1, y: 0 } }, 0);
    right.handle({ type: "look", value: { x: 1, y: 0 } }, 0);
    const eye = (f) =>
      f.resources[0].shapes.find((s) => s.id === "eye-0").transform[4];
    assert.ok(eye(left.sample(1)) < eye(right.sample(1)));
    left.handle({ type: "hover", value: false }, 1);
    assert.deepEqual(left.sample(1.5), baseline.sample(1.5));
    const click = make();
    click.handle({ type: "tap" }, 0);
    assert.notDeepEqual(click.sample(0.24), baseline.sample(0.24));
    assert.deepEqual(click.sample(1), baseline.sample(1));
    assert.deepEqual(click.getPose(), baseline.getPose());
    assert.deepEqual(click.getSkin(), baseline.getSkin());
    const pressed = make();
    pressed.handle({ type: "press", value: true }, 0);
    assert.deepEqual(pressed.sample(0.5), baseline.sample(0.5));
    assert.deepEqual(pressed.sample(0.5, true), baseline.sample(0.5, true));
  });
}

test('cat click shakes the head in both directions without a forced wink', async () => {
  const { BotEngine } = await import('../packages/grove/dist/rigs/mew/vendor/engine.js');
  const { masterProfile } = await import('../packages/grove/dist/rigs/mew/soft-master.js');
  const engine = new BotEngine(100,'idle',masterProfile(45,0));
  const turns=[];
  for(const t of [.12,.25,.4,.53]) {
    const normal=engine.sample(t);
    const shaken=engine.sample(t,{look:{x:0,y:0},attention:0,pressed:false,reaction:t});
    turns.push(shaken.attachmentYaw-normal.attachmentYaw);
    assert.equal(shaken.eyes.length,normal.eyes.length);
    assert.deepEqual(shaken.eyes.map(e=>e.d),normal.eyes.map(e=>e.d));
    assert.equal(shaken.attachmentSurface.sil.sx,normal.attachmentSurface.sil.sx);
    assert.equal(shaken.attachmentSurface.sil.sy,normal.attachmentSurface.sil.sy);
  }
  assert.ok(turns.some(x=>x>3) && turns.some(x=>x< -3));
  assert.deepEqual(engine.sample(.8,{look:{x:0,y:0},attention:0,pressed:false,reaction:.8}),engine.sample(.8));
});

test('irritated face is selectable and click temporarily overlays it',()=>{
  const make=(expression=-1)=>new PetEngine(mewRig,patches,{pose:{state:0,expression},transitionDuration:0});
  const selected=make(16);
  const face=selected.sample(1).resources[0].shapes;
  assert.equal(face.find(s=>s.id==='irritated-eye-0').attrs.opacity,1);
  assert.equal(face.find(s=>s.id==='eye-0').attrs.opacity,0);
  assert.equal(face.some(s=>s.id.includes('mouth')),false);
  const baseline=make(4),clicked=make(4);
  clicked.handle({type:'tap'},0);
  assert.equal(clicked.sample(.2).resources[0].shapes.find(s=>s.id==='irritated-eye-1').attrs.opacity,1);
  assert.equal(clicked.getPose().expression,4);
  assert.deepEqual(clicked.sample(1),baseline.sample(1));
});
