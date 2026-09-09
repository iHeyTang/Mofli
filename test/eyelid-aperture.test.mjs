import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expressiveEye} from '../packages/rig-bloub/dist/eye-geometry.js';
function points(g){const d=expressiveEye(g).d;const commands=d.match(/[MC][^MCZ]+/g);return commands.map(c=>{const n=c.slice(1).trim().split(/[ ,]+/).map(Number);return n.slice(-2)}).slice(0,48);}
test('lid opening maintains upper/lower ordering throughout arch-to-open transitions',()=>{
 for(const sign of [-1,1])for(const [w0,h0,b0,w1,h1] of [[25,10,10,29,34],[42,9,12,32,65],[27,10,14,28,55]]){
  for(let j=0;j<=100;j++){
   const t=j/100,p=points({w:w0+(w1-w0)*t,h:h0+(h1-h0)*t,bend:sign*b0*(1-t),curve:1-t,heart:0});
   assert.ok(p.flat().every(Number.isFinite));
   for(let i=0;i<12;i++)assert.ok(p[i][1]<p[24-i][1],`crossed eyelids at ${t}, point ${i}`);
  }
 }
});
