import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ClickTracker} from '../packages/core/dist/clicks.js';
import {headReaction} from '../packages/grove/dist/rigs/head-interaction.js';
const hit = region => ({region,point:{x:.3,y:-.2}});
test('click selection avoids repeats, escalates a burst and cools down',()=>{
 const tracker=new ClickTracker();
 const a=tracker.next(hit('face'),0,.1);
 assert.equal(tracker.next(hit('face'),.2,.1).count,2);
 tracker.next(hit('crown'),.4,.2);
 const intense=tracker.next(hit('face'),.6,.4);
 assert.equal(intense.intense,true);assert.equal(intense.count,4);
 assert.equal(tracker.next(hit('face'),.9,.3),undefined);
 const reset=tracker.next(hit('face'),2.1,.3);assert.equal(reset.count,1);assert.equal(reset.intense,false);assert.notEqual(reset.variant,intense.variant);
});
test('outside clicks do not count as repeated petting and invalid positions are ignored',()=>{
 const t=new ClickTracker();
 for(let i=0;i<8;i++)assert.equal(t.next(hit('outside'),i*.2).count,0);
 assert.equal(t.next(hit('body'),2).count,1);
 assert.equal(t.next({region:'body',point:{x:NaN,y:0}},3),undefined);
});
test('regional reactions are distinct, deterministic, bounded and return to neutral',()=>{
 const signatures=new Set();
 for(const region of ['outside','crown','left','right','face','chin']){
  const click={...hit(region),variant:1,count:1,intense:false};
  signatures.add(JSON.stringify(headReaction(click,.4,true)));
  assert.deepEqual(headReaction(click,.4,true),headReaction(click,.4,true));
  for(let t=0;t<2;t+=.02)assert.ok(Object.values(headReaction(click,t,true)).every(Number.isFinite));
  assert.deepEqual(headReaction(click,2,true),headReaction(undefined,2,true));
 }
 assert.equal(signatures.size,6);
});

test('very fast clicks count without restarting, outside clicks cannot cancel a body response',()=>{
 const t=new ClickTracker();
 assert.ok(t.next(hit('face'),0));
 assert.equal(t.next(hit('outside'),.01),undefined);
 assert.equal(t.next(hit('face'),.02).count,2);
 assert.equal(t.next(hit('face'),.04).count,3);
 assert.equal(t.next(hit('face'),.06).intense,true);
 assert.equal(t.next(hit('face'),.07),undefined);
});
test('escalation starts from the active pose instead of neutral',()=>{
 const ordinary={...hit('crown'),variant:0,count:1,intense:false};
 const upgraded={...hit('face'),variant:1,count:4,intense:true,from:{reaction:ordinary,elapsed:.3}};
 assert.deepEqual(headReaction(upgraded,0,true),headReaction(ordinary,.3,true));
 assert.deepEqual(headReaction(upgraded,.16,true),headReaction({...upgraded,from:undefined},.16,true));
});
test('engine preserves the active frame on ordinary clicks and burst handoff',async()=>{
 const {PetEngine}=await import('@mofli/core');
 const {mewRig,sesame}=await import('@mofli/grove');
 const e=new PetEngine(mewRig,sesame,{pose:{state:0},transitionDuration:0});
 e.handle({type:'tap',hit:hit('crown'),choice:0},0);
 const before=e.sample(.3);
 e.handle({type:'tap',hit:hit('face'),choice:.4},.3);
 assert.deepEqual(e.sample(.3),before);
 e.handle({type:'tap',hit:hit('face'),choice:.5},.5);
 const handoff=e.sample(.7);
 e.handle({type:'tap',hit:hit('face'),choice:.6},.7);
 assert.deepEqual(e.sample(.7),handoff);
});

test('single click waits 250ms and a second click replaces it before it is shown', async()=>{
 const {PetEngine}=await import('@mofli/core');
 const {mewRig,sesame}=await import('@mofli/grove');
 const seen=[];
 const rig={...mewRig,sample(input){seen.push(input.state);return mewRig.sample(input);}};
 const e=new PetEngine(rig,sesame,{pose:{state:0},transitionDuration:0});
 e.handle({type:'tap',hit:hit('face'),choice:0},0);
 e.sample(.249); assert.equal(seen.at(-1).click,undefined);
 e.sample(.25); assert.equal(seen.at(-1).click.count,1);
 const second=new PetEngine(rig,sesame,{pose:{state:0},transitionDuration:0});
 second.handle({type:'tap',hit:hit('face'),choice:0},0);
 second.handle({type:'tap',hit:hit('face'),choice:0},.06);
 second.sample(.06); assert.equal(seen.at(-1).click,undefined);
 second.sample(.309); assert.equal(seen.at(-1).click,undefined);
 second.sample(.31); assert.equal(seen.at(-1).click.count,2);
 assert.equal(seen.at(-1).reactionAt,.31);
});

test('three clicks wait for quiet while four clicks skip intermediate responses', async()=>{
 const {PetEngine}=await import('@mofli/core');
 const {mewRig,sesame}=await import('@mofli/grove');
 let state;
 const rig={...mewRig,sample(input){state=input.state;return mewRig.sample(input);}};
 for(const count of [3,4]) {
  const e=new PetEngine(rig,sesame,{pose:{state:0},transitionDuration:0});
  for(let i=0;i<count;i++) {
   const time=i*.06;
   e.handle({type:'tap',hit:hit('face'),choice:0},time);
   e.sample(time);
   if(i<3) assert.equal(state.click,undefined);
  }
  if(count===3) {
   e.sample(.369); assert.equal(state.click,undefined);
   e.sample(.37); assert.equal(state.click.count,3);assert.equal(state.click.intense,false);
  } else {
   assert.equal(state.click.count,4);assert.equal(state.click.intense,true);
   e.handle({type:'tap',hit:hit('face'),choice:0},.2);
   e.sample(.2); assert.equal(state.reactionAt,.18);
  }
 }
});

test('150–220ms click intervals stay pending until burst threshold',()=>{
 for(const gap of [.15,.18,.2,.22]) {
  const tracker=new ClickTracker();
  for(let i=0;i<4;i++) {
   const click=tracker.next(hit('face'),i*gap,0);
   assert.equal(click.count,i+1);
   assert.equal(click.intense,i===3);
   assert.equal(click.delay,i===3?0:.25);
  }
 }
});
