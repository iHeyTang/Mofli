import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BotEngine} from '../packages/rig-bloub/dist/vendor/engine.js';
import {STATES} from '../packages/rig-bloub/dist/vendor/states.js';
import {EXPRESSIONS} from '../packages/rig-bloub/dist/vendor/expressions.js';
import {characterExpression} from '../packages/rig-bloub/dist/character-expression.js';

test('character eye styling preserves state-authored yaw and pitch across the timeline',()=>{
 for(const style of ['mellow','spry','steady']){
  const expression=characterExpression(EXPRESSIONS[0],style,'rest');
  const engine=new BotEngine(100,'idle',null,expression);
  for(const state of STATES.filter(s=>s.baseBody&&!s.baseFace))for(const time of [0,.25,.8,1.5,3]){
   const original=state.pose(time),styled=engine.posed(state,time,null,expression);
   assert.equal(styled.gaze.yaw,original.gaze.yaw,`${style}/${state.id} yaw`);
   assert.equal(styled.gaze.pitch,original.gaze.pitch,`${style}/${state.id} pitch`);
   assert.ok(Math.abs(styled.gaze.roll-original.gaze.roll)<=2.001);
  }
 }
});
