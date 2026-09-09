import {test} from 'node:test';import assert from 'node:assert/strict';
import {defineSkin,defineAttachment,defineResourcePack,PetRegistry,headMounts,headMountCapabilities} from '@mofli/core';
test('a complete independent rig, skin and accessory pack needs only core',()=>{
 const rig={id:'independent-orb',name:'Orb',version:1,colors:{body:'#567856'},parameters:{},mounts:headMountCapabilities,sample({skin}){return {shapes:[{id:'body',kind:'ellipse',attrs:{cx:0,cy:0,rx:50,ry:50,fill:skin.colors.body}}],anchors:[],bounds:{x:-60,y:-60,width:120,height:120},slots:{'head.overlay':1},mounts:headMounts({center:{x:0,y:0},radius:50,top:50,bottom:50,visibility:1,gaze:{yaw:0,pitch:0,roll:0}})}}};
 const skin=defineSkin(rig,{id:'independent-mint',name:'Mint'});
 const attachment=defineAttachment({id:'independent-gem',mount:'head.forehead',slot:'head.overlay',scene:{version:1,nodes:[{id:'gem',geometry:{kind:'ellipse',cx:0,cy:0,rx:.1,ry:.1},attrs:{fill:'#eee'}}]}});
 const pack=defineResourcePack({id:'independent',version:1,rigs:[rig],skins:[skin],attachments:[{name:'Gem',attachment}]});
 const pet=new PetRegistry().registerPacks(pack).create({version:1,skin,pose:{},rigConfig:{},attachments:[{id:'gem',type:attachment.id,version:1}]});
 assert.equal(pet.sample(0).shapes.length,2);
});
