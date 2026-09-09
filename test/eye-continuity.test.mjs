import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetEngine} from '@mofli/core';
import {bloubRig} from '@mofli/rig-bloub';
import {stoneSkin} from '@mofli/skin-mofli-stone';
import {doughSkin} from '@mofli/skin-mofli-dough';
import {beanSkin} from '@mofli/skin-mofli-bean';
const values=frame=>[...frame.resources[0].shapes.filter(s=>s.id.startsWith('eye-')),...frame.shapes.filter(s=>s.id.startsWith('pupil-'))].flatMap(s=>[...(s.attrs.d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number),...s.transform, s.attrs.opacity]);
const jump=(a,b,label)=>{assert.equal(a.length,b.length,label);assert.ok(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.08,label);};
test('every directed expression pair has continuous eye geometry at entry and during interruption',()=>{
 for(const skin of [doughSkin,beanSkin,stoneSkin])for(let from=-1;from<=17;from++)for(let to=-1;to<=17;to++){
  const e=new PetEngine(bloubRig,skin,{pose:{state:0,expression:from}});
  const before=values(e.sample(.7));e.setPose({state:0,expression:to},.7);
  jump(before,values(e.sample(.700001)),`${skin.id} ${from}->${to}`);
  const mid=values(e.sample(.81));e.setPose({state:0,expression:from},.81);
  jump(mid,values(e.sample(.810001)),`${skin.id} interrupted ${from}->${to}`);
 }
});
