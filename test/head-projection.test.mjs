import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectHead} from '../packages/grove/dist/rigs/bloub/head-projection.js';
test('head projection preserves the front profile and a sphere, and remains bounded across turns',()=>{
 const shape=Array.from({length:64},(_,i)=>1+.15*Math.cos(i/64*Math.PI*4)+.08*Math.sin(i/64*Math.PI*6));
 const front=projectHead(shape,{yaw:0,pitch:0,roll:0});
 assert.ok(front.every((r,i)=>Math.abs(r-shape[i])<1e-12));
 for(const yaw of [-60,-30,0,30,60])for(const pitch of [-40,0,40]){
  const gaze={yaw,pitch,roll:17};
  assert.ok(projectHead(Array(64).fill(1),gaze).every(r=>Math.abs(r-1)<1e-12));
  const a=projectHead(shape,gaze),b=projectHead(shape,{...gaze,yaw:yaw+.0001});
  assert.ok(a.every(r=>Number.isFinite(r)&&r>.4&&r<1.5));
  assert.ok(a.every((r,i)=>Math.abs(r-b[i])<.00001));
 }
 assert.notDeepEqual(front,projectHead(shape,{yaw:30,pitch:20,roll:0}));
});
