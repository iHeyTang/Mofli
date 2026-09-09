import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveEyeComponent,blendEyeComponent,renderEyeComponent} from '../packages/rig-bloub/dist/eye-component.js';
test('eye component interpolates independently authored upper and lower lids',()=>{
 for(const socket of [false,true]){
  const closed=resolveEyeComponent({w:.42,h:.1,bend:.12},socket);
  const open=resolveEyeComponent({w:.32,h:.65},socket);
  let lastGap=0;
  for(let j=0;j<=100;j++){
   const t=j/100,p=blendEyeComponent(closed,open,t);
   assert.ok(p.lower-p.upper>=lastGap-1e-10);lastGap=p.lower-p.upper;
   assert.equal(p.upper,closed.upper+(open.upper-closed.upper)*t);
   assert.equal(p.lower,closed.lower+(open.lower-closed.lower)*t);
   assert.ok(p.corner>0);
   assert.ok(!/NaN|Infinity/.test(renderEyeComponent(p)));
   const back=blendEyeComponent(open,closed,1-t);
   assert.ok(Math.abs(p.upper-back.upper)<1e-10 && Math.abs(p.lower-back.lower)<1e-10);
  }
 }
});
