import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine,composeAttachments,blendFrames} from '@mofli/core';
import {bloubRig} from '@mofli/rig-bloub';
import {catHeadRig} from '@mofli/rig-cat-head';
import {bloubSkin} from '@mofli/skin-bloub';
import {sesame} from '@mofli/skin-cat-ink';
import {hat} from '@mofli/attachment-hat';
import {bow} from '@mofli/attachment-bow';
test('independent attachments share both rigs, disappear on symbols, and isolate instances',()=>{
 for(const [rig,skin] of [[bloubRig,bloubSkin],[catHeadRig,sesame]]){
  const engine=new PetEngine(rig,skin,{pose:{state:0}}),frame=engine.sample(1);
  const mounted=composeAttachments(frame,[{id:'hat',attachment:hat},{id:'bow',attachment:bow}]);
  assert.ok(mounted.shapes.length>frame.shapes.length+5);
  assert.ok(mounted.shapes.slice(-5).every(s=>s.id.startsWith('attachment-')));
  assert.equal(composeAttachments(frame,[]),frame);
  assert.throws(()=>composeAttachments(frame,[{id:'a',attachment:hat},{id:'b',attachment:hat}]),/occupied/);
  assert.throws(()=>composeAttachments({...frame,mounts:{}},[{id:'a',attachment:hat}]),/Incompatible/);
  engine.setPose({state:6},1);
  const end=engine.sample(3);
  assert.equal(end.mounts['head.crown'].visibility,0);
  assert.equal(composeAttachments(end,[{id:'a',attachment:hat}]).shapes.at(-1).attrs.opacity,0);
  const mixed=blendFrames(frame,end,.5);
  assert.ok(mixed.mounts['head.crown'].visibility>0&&mixed.mounts['head.crown'].visibility<1);
 }
});

test('mounts project yaw and pitch even on a circular head, and blending preserves shear',async()=>{
 const {contourMounts}=await import('@mofli/core');
 const {blendMountFrames}=await import('../packages/core/dist/attachments.js');
 const points=Array.from({length:64},(_,i)=>({x:100*Math.cos(i*Math.PI/32),y:100*Math.sin(i*Math.PI/32)}));
 const front=contourMounts(points,1,{yaw:0,pitch:0,roll:0});
 const left=contourMounts(points,1,{yaw:-.6,pitch:.4,roll:0});
 const right=contourMounts(points,1,{yaw:.6,pitch:.4,roll:0});
 for(const id of Object.keys(front)){
  assert.ok(left[id].matrix[4]<right[id].matrix[4]);
  assert.ok(right[id].matrix[0]<front[id].matrix[0]);
  assert.ok(right[id].matrix[3]<front[id].matrix[3]);
  assert.notEqual(right[id].matrix[1],0);
  for(const [t,expected] of [[0,front],[1,right]]){
   const actual=blendMountFrames(front,right,t)[id].matrix;
   actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[id].matrix[i])<1e-8));
  }
 }
});

test('crown and lower-front mount share the face basis and project their positions',async()=>{
 const {headMounts}=await import('@mofli/core');
 const {headBasis}=await import('@mofli/core/spherical-face');
 for(const yaw of [-38,0,38])for(const pitch of [-28,0,28]){
  const gaze={yaw,pitch,roll:13},basis=headBasis(gaze);
  const mounts=headMounts({center:{x:3,y:5},radius:100,top:95,bottom:105,visibility:1,gaze});
  assert.deepEqual(mounts['head.crown'].volume.right,basis.right);
  assert.deepEqual(mounts['head.crown'].volume.down,basis.down);
  assert.deepEqual(mounts['head.crown'].volume.forward,basis.f);
  const expected=[100*basis.right[0],100*basis.right[1],100*basis.down[0],100*basis.down[1],3+85*basis.down[0]+55*basis.f[0],5+85*basis.down[1]+55*basis.f[1]];
  mounts['head.lower.front'].matrix.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-9));
 }
});

test('nonoverlapping hat retains self-culling without host-depth layers',()=>{
 const engine=new PetEngine(bloubRig,bloubSkin,{pose:{state:0}}),frame=engine.sample(1);
 const mounted=composeAttachments(frame,[{id:'hat',attachment:hat}]);
 const body=mounted.shapes.findIndex(s=>s.id==='paper-body');
 assert.ok(body>=0);
 assert.ok(!mounted.shapes.slice(0,body).some(s=>s.id.startsWith('attachment-hat-')));
 const parts=mounted.shapes.filter(s=>s.id.startsWith('attachment-hat-'));
 assert.ok(parts.some(s=>s.attrs.opacity===0),'back-facing surfaces hidden');
 assert.ok(parts.some(s=>s.attrs.opacity>0),'front-facing surfaces visible');
});

 test('lower-front mounting position follows left/right turns before clearance',async()=>{
 const {headMounts}=await import('@mofli/core');
 const at=yaw=>headMounts({center:{x:0,y:0},radius:100,top:100,bottom:100,visibility:1,gaze:{yaw,pitch:0,roll:0}})['head.lower.front'].matrix;
 assert.ok(at(-30)[4]<at(0)[4]);assert.ok(at(30)[4]>at(0)[4]);
 assert.ok(Math.abs(at(30)[4]+at(-30)[4])<1e-8);
 });

test('composer preserves bow mount and opacity without automatic separation',()=>{
 const engine=new PetEngine(bloubRig,bloubSkin,{pose:{state:0}}),frame=engine.sample(1);
 const result=composeAttachments(frame,[{id:'bow',attachment:bow}]);
 for(const shape of result.shapes.filter(s=>s.id.startsWith('attachment-bow-'))){
  assert.deepEqual(shape.transform,frame.mounts['head.lower.front'].matrix);
  assert.equal(shape.attrs.opacity,frame.mounts['head.lower.front'].visibility);
 }
});
