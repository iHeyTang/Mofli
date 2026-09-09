import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine} from '@mofli/core';
import {mewRig,catStates} from '@mofli/grove/rigs/mew';
import { patches } from "@mofli/grove/skins/cat-patches";
test('expanded ear and cheek extremes stay finite through shapes, turns and states',()=>{
 for(const earLength of [12,45,85]) for(const cheek of [-6,0,8]) for(const shape of [-1,0,2,4,6,7]) {
  const engine=new PetEngine(mewRig,patches,{rigConfig:{earLength,cheek,shape},pose:{state:0},transitionDuration:0});
  let time=0;
  for(const state of catStates) {
   engine.setPose({state:state.index},time);
   engine.handle({type:'look',value:{x:state.index%2 ? -1:1,y:.8}},time);
   for(const dt of [0,.1,.4,1]) assert.ok(!/NaN|Infinity/.test(JSON.stringify(engine.sample(time+dt))));
   time+=1;
  }
 }
});

test('longer ears broaden their roots without expanding the lower face',async()=>{
 const {masterProfile,softBody}=await import('../packages/grove/dist/rigs/mew/soft-master.js');
 const base=masterProfile(45,0),long=masterProfile(85,0);
 for(let i=0;i<33;i++) assert.equal(long[i],base[i]);
 // A normalized shoulder grows beyond pure height scaling.
 assert.ok((long[38]-softBody[38])/(85/45)>base[38]-softBody[38]);
 assert.ok((long[58]-softBody[58])/(85/45)>base[58]-softBody[58]);
 for(let i=0;i<64;i++) assert.ok(Math.abs(long[i]-long[(32-i+64)%64])<.01);
});
