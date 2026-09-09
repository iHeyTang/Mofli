import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PetRegistry} from '@mofli/core';
import {bloubRig} from '@mofli/rig-bloub';
import {stoneSkin} from '@mofli/skin-mofli-stone';
import {hat} from '@mofli/attachment-hat';
import {bow} from '@mofli/attachment-bow';
const registry=()=>new PetRegistry().registerRig(bloubRig).registerAttachment(hat).registerAttachment(bow);
const config=()=>({version:1,skin:structuredClone(stoneSkin),rigConfig:{},pose:{state:0},attachments:[{id:'my-hat',type:'hat',version:1,parameters:{hoverHeight:.52}},{id:'my-bow',type:'bow',version:1}]});
test('complete pet JSON roundtrip preserves character, pose and accessory geometry',()=>{
 const r=registry(),a=r.create(config());
 const json=JSON.parse(JSON.stringify(a.exportConfig())),b=r.create(json);
 assert.deepEqual(a.sample(.7,true),b.sample(.7,true));
 assert.deepEqual(b.exportConfig(),json);
 json.attachments[0].parameters.hoverHeight=.9;
 assert.equal(b.exportConfig().attachments[0].parameters.hoverHeight,.52);
 assert.deepEqual(a.sample(.7,true),b.sample(.7,true));
});
test('pet configuration rejects missing implementations, invalid design and attachment conflicts',()=>{
 for(const mutate of [c=>c.version=2,c=>c.skin.rig='missing',c=>c.attachments[0].type='missing',c=>c.attachments[0].parameters.hoverHeight=8,c=>c.attachments.push({...c.attachments[0],id:'duplicate'}),c=>c.skin.design.contour[0]=NaN,c=>c.pose.state=Infinity]){
  const c=config();mutate(c);assert.throws(()=>registry().create(c));
 }
});
test('skin-owned design changes survive export and drive the same rig',()=>{
 const r=registry(),c=config(),original=r.create(c);
 c.skin.id='custom-stone';c.skin.design.contour=c.skin.design.contour.map(x=>x*.9);
 c.skin.design.expressions[0][0].w=.4;
 const custom=r.create(c);
 assert.notDeepEqual(custom.sample(0,true).shapes,original.sample(0,true).shapes);
 assert.deepEqual(custom.exportConfig().skin.design,c.skin.design);
});
