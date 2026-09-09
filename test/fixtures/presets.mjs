import { bloubRig } from "@mofli/rig-bloub";
import { bloubSkin } from "@mofli/skin-bloub";
export { bloubRig };
// Minimal test-only rectangle: checks generic core transitions and motion channels.
// Not a character rig, skin package or Studio entry.
export const testRig = {
  id: 'test-rectangle', version: 1, name: 'Test rectangle',
  parameters: {width: {min:105,max:155,default:128}},
  colors: {body:'#D7A689'},
  channels: {lift:{min:0,max:40,default:0}},
  sample({skin, motion, state}) {
    const y = 100 - (motion.lift ?? 0);
    return {shapes:[{id:'body',kind:'rect',attrs:{x:0,y,width:skin.parameters.width,height:state.mood==='happy'?60:80,fill:skin.colors.body}}], anchors:[],bounds:{x:0,y,width:skin.parameters.width,height:80}};
  }
};
const base = {version:1,id:'test-base',name:'Test',rig:testRig.id,colors:{body:'#D7A689'}};
export const presets = [base,
 {...base,id:'test-copper',colors:{body:'#995533'}},
 {...base,id:'test-silver',colors:{body:'#cccccc'}},bloubSkin];
