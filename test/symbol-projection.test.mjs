import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BotEngine} from '../packages/rig-bloub/dist/vendor/engine.js';
import {STATES} from '../packages/rig-bloub/dist/vendor/states.js';
import {EXPRESSIONS} from '../packages/rig-bloub/dist/vendor/expressions.js';
import {characterExpression} from '../packages/rig-bloub/dist/character-expression.js';
test('symbol and special-state silhouettes retain the original geometry for every character',()=>{
 for(const style of ['mellow','spry','steady'])for(const state of STATES.filter(s=>!s.baseBody)){
  const base=new BotEngine(100,state.id);
  const custom=new BotEngine(100,state.id,null,characterExpression(EXPRESSIONS[0],style,'rest'));
  for(const time of [0,.2,.7,1.3,2.5])assert.equal(custom.sample(time).bodyPath,base.sample(time).bodyPath,`${style}/${state.id}/${time}`);
 }
});
