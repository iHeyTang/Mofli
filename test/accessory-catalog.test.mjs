import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine,composeAttachments,headMountCapabilities,PetRegistry} from '@mofli/core';
import {bloubRig} from '@mofli/grove/rigs/bloub';
import {mewRig} from '@mofli/grove/rigs/mew';
import {doughSkin} from '@mofli/grove/skins/mofli-dough';
import {sesame} from '@mofli/grove/skins/cat-ink';
import {hat} from '@mofli/grove/accessories/hat';
import {bow} from '@mofli/grove/accessories/bow';
import {extraParts} from '../apps/studio/accessories.js';
const parts=[hat,bow,...extraParts.map(p=>p.attachment)];
test('seven mount families expose the available independently packaged accessories',()=>{
 assert.equal(parts.length,20);
 for(const mount of Object.keys(headMountCapabilities))assert.equal(parts.filter(a=>a.mount===mount).length,mount==='head.sides'?2:3,mount);
});
test('every accessory renders finite geometry across both rigs, all states and size extremes',()=>{
 for(const [rig,skin] of [[bloubRig,doughSkin],[mewRig,sesame]])for(let state=0;state<14;state++) {
  const engine=new PetEngine(rig,skin,{pose:{state}});
  for(const time of [0,.75,2])for(const part of parts)for(const size of [.6,1.4]){
   const frame=composeAttachments(engine.sample(time),[{id:part.id,attachment:part,parameters:part.parameters?.size?{size}:{}}],time);
   assert.ok(!/NaN|Infinity/.test(JSON.stringify(frame)),`${rig.id}/${state}/${part.id}`);
   const ids=frame.shapes.map(s=>s.id);assert.equal(new Set(ids).size,ids.length);
  }
 }
});
test('seven-part compositions roundtrip and orbit animation runs outside Studio',()=>{
 const registry=new PetRegistry().registerRig(bloubRig);
 parts.forEach(a=>registry.registerAttachment(a));
 const chosen=['sprout','bunny','flower','blush','scarf','pearls','fireflies'];
 const config=registry.export(new PetEngine(bloubRig,doughSkin,{pose:{state:0}}),chosen.map(id=>({id,type:id,version:1})));
 const pet=registry.create(JSON.parse(JSON.stringify(config)));
 const orbit=t=>pet.sample(t).shapes.filter(s=>s.id.startsWith('attachment-fireflies-'));
 assert.equal(pet.exportConfig().attachments.length,7);
 assert.notDeepEqual(orbit(0),orbit(1));
 assert.throws(()=>registry.resolve({...config,attachments:[...config.attachments,{id:'other',type:'halo',version:1}]}),/occupied/);
});
test('group members and curved surface samples follow the head basis',()=>{
 const engine=new PetEngine(bloubRig,doughSkin,{pose:{state:0}});
 const a=engine.sample(1,true).mounts;
 engine.setRigConfig({...engine.getRigConfig(),faceYaw:18},1);
 const b=engine.sample(2,true).mounts;
 assert.notDeepEqual(a['head.sides'].members.left.matrix,b['head.sides'].members.left.matrix);
 assert.notDeepEqual(a['head.cheeks'].members.right.matrix,b['head.cheeks'].members.right.matrix);
 const probe={id:'probe',mount:'head.cheeks',slot:'head.overlay',volume:true,sample(ctx){
  assert.notDeepEqual(ctx.surface([.12,.05],'left'),ctx.project([.12,.05,0],'left'));
  assert.throws(()=>ctx.project([0,0,0],'missing'),/Unknown mount member/);return [];
 }};
 composeAttachments(engine.sample(2),[{id:'probe',attachment:probe}]);
});

test('hanging pieces swing at a fixed root, and ambient animations change speed and fade',()=>{
 const engine=new PetEngine(bloubRig,doughSkin,{pose:{state:0,expression:-1}});
 const frame=engine.sample(1,true);
 for(const id of ['bells','pearls','ribbons','medal','scarf','bubbles','fireflies','petals']){
  const part=parts.find(p=>p.id===id);
  const sample=time=>composeAttachments(frame,[{id,attachment:part}],time).shapes.filter(s=>s.id.startsWith('attachment-'));
  assert.notDeepEqual(sample(.25),sample(1),`${id} moves without moving the host`);
  assert.deepEqual(sample(1),sample(1),`${id} animation is deterministic`);
 }
 for(const id of ['bubbles','petals']){
  const part=parts.find(p=>p.id===id);
  const shapes=composeAttachments(frame,[{id,attachment:part}],0).shapes.filter(s=>s.id.startsWith('attachment-'));
  assert.ok(shapes.some(s=>s.attrs.opacity===0),`${id} wraps outside its visible interval`);
 }
});

test('paired ears have separate tangent planes with different foreshortening on a turn',()=>{
 const engine=new PetEngine(bloubRig,doughSkin,{rigConfig:{faceYaw:18},pose:{state:0,expression:-1}});
 const {left,right}=engine.sample(1,true).mounts['head.sides'].members;
 assert.notDeepEqual(left.volume.right,right.volume.right);
 assert.ok(Math.abs(Math.hypot(...left.matrix.slice(0,2))-Math.hypot(...right.matrix.slice(0,2)))>1);
});
