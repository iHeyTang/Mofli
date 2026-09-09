import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine} from '@mofli/core';
import {bloubRig} from '@mofli/grove/rigs/bloub';
import {doughSkin} from '@mofli/grove/skins/mofli-dough';
import {beanSkin} from '@mofli/grove/skins/mofli-bean';
import {stoneSkin} from '@mofli/grove/skins/mofli-stone';

test('authored character faces respond to each exposed rig control',()=>{
 for(const skin of [doughSkin,beanSkin,stoneSkin]) {
  const frame=(rigConfig,expression=-1)=>JSON.stringify(new PetEngine(bloubRig,skin,{rigConfig,pose:{state:0,expression}}).sample(1,true));
  const baseline=frame({});
  for(const key of ['eyeWidth','eyeHeight','eyeSpacing','faceYaw','facePitch','faceRoll']) {
   const rule=bloubRig.parameters[key];
   assert.notEqual(frame({[key]:rule.max}),baseline,`${skin.id}: ${key} must affect rendering`);
  }
  for(const expression of [2,4,17]) assert.notEqual(frame({eyeWidth:.3},expression),frame({},expression),`${skin.id}: expression ${expression} preserves size adjustment`);
 }
});
