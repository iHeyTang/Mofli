import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine} from '@mofli/core';
import {bloubRig,bloubStates,defineBloubSkin} from '@mofli/rig-bloub';
import {stoneSkin} from '@mofli/skin-mofli-stone';
test('socket eyes share eyelid transforms and clip pupils through every state',()=>{
 for(const state of bloubStates){
  const e=new PetEngine(bloubRig,stoneSkin,{pose:{state:state.index}});
  for(const time of [0,.1,.4,state.posterTime]){
   const frame=e.sample(time);
   for(const pupil of frame.shapes.filter(s=>s.id.startsWith('pupil-'))){
    const resource=frame.resources.find(r=>r.id===pupil.mask);
    assert.equal(resource.shapes[0].transform,undefined);
    assert.equal(pupil.transform.length,6);
    assert.equal(resource.shapes[0].attrs.fill,'#ffffff');
    assert.equal(pupil.kind,'path');
    assert.ok(!/NaN|Infinity/.test(pupil.attrs.d));
   }
   assert.ok(!/NaN|Infinity/.test(JSON.stringify(frame)));
  }
 }
});
test('unsupported eye modes fail validation; default mode retains no pupils',()=>{
 assert.throws(()=>defineBloubSkin({id:'invalid',name:'invalid',variants:{eyes:'arbitrary'}}));
 const skin=defineBloubSkin({id:'plain',name:'plain'});
 assert.ok(!new PetEngine(bloubRig,skin).sample(0).shapes.some(s=>s.id.startsWith('pupil-')));
});

import {doughSkin} from '@mofli/skin-mofli-dough';
import {beanSkin} from '@mofli/skin-mofli-bean';
test('three approved character skins keep distinct mother contours across state round trips',()=>{
 const bodies=new Set();
 for(const skin of [doughSkin,beanSkin,stoneSkin]){
  const e=new PetEngine(bloubRig,skin,{pose:{state:0}});
  const mother=e.sample(0).shapes.find(s=>s.id==='paper-body').attrs.d;
  bodies.add(mother);
  for(const state of bloubStates){
   const frame=new PetEngine(bloubRig,skin,{pose:{state:state.index}}).sample(state.posterTime);
   assert.ok(!/NaN|Infinity/.test(JSON.stringify(frame)));
  }
  e.setPose({state:3},1);e.sample(2);e.setPose({state:0},3);
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(e.sample(4))));
  assert.equal(e.exportSkin().rigConfig.shape,skin.rigConfig.shape);
 }
 assert.equal(bodies.size,3);
});

test('character expression profiles interpolate pupils and remain finite through interruptions',()=>{
 for(const skin of [doughSkin,beanSkin,stoneSkin]){
  const e=new PetEngine(bloubRig,skin,{pose:{state:0,expression:-1}});
  let time=0;
  for(const expression of [11,4,2,16,-1]){
   time+=.2;e.setPose({state:0,expression},time);
   for(const dt of [0,.02,.1,.3])assert.ok(!/NaN|Infinity/.test(JSON.stringify(e.sample(time+dt))));
  }
 }
 const rest=new PetEngine(bloubRig,stoneSkin,{pose:{state:0,expression:-1}}).sample(.4);
 const startled=new PetEngine(bloubRig,stoneSkin,{pose:{state:0,expression:2}}).sample(.4);
 const span=f=>{const numbers=f.shapes.find(s=>s.id==='pupil-0').attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number).filter((_,i)=>i%2===0);return Math.max(...numbers)-Math.min(...numbers)};
 assert.ok(span(startled)<span(rest));
 const happy=new PetEngine(bloubRig,doughSkin,{pose:{state:0,expression:4}}).sample(.4);
 assert.match(happy.resources[0].shapes[1].attrs.d,/C/);
});

test('stone can hide pupils or morph them into hearts independently of the eye openings',()=>{
 const frame=expression=>new PetEngine(bloubRig,stoneSkin,{pose:{state:0,expression}}).sample(.5);
 const white=frame(16),love=frame(17);
 assert.ok(white.shapes.filter(s=>s.id.startsWith('pupil-')).every(s=>s.attrs.opacity===0));
 assert.ok(love.shapes.filter(s=>s.id.startsWith('pupil-')).every(s=>s.kind==='path' && /C/.test(s.attrs.d)));
 const e=new PetEngine(bloubRig,stoneSkin,{pose:{state:0,expression:17}});
 e.setPose({expression:16,state:0},1);
 for(const t of [1,1.05,1.2,1.6])assert.ok(!/NaN|Infinity/.test(JSON.stringify(e.sample(t))));
});

test('love uses heart eye openings on solid skins and authored stone expressions have finite independent eye shapes',()=>{
 for(const skin of [doughSkin,beanSkin]){
  const frame=new PetEngine(bloubRig,skin,{pose:{state:0,expression:17}}).sample(.5);
  assert.match(frame.resources[0].shapes[1].attrs.d,/C/);
  assert.ok(!frame.shapes.some(s=>s.id.startsWith('pupil-')));
 }
 for(const expression of [9,10,12,14,15]){
  const frame=new PetEngine(bloubRig,stoneSkin,{pose:{state:0,expression}}).sample(.5);
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(frame)));
  assert.equal(frame.resources[0].shapes.filter(s=>s.id.startsWith('eye-')).length,2);
 }
});
