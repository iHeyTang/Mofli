import {headBasis} from './spherical-face.js';
import type {MountFrames,VolumeMount} from './attachments.js';
import type {Point} from './index.js';
export interface HeadMountInput {
  center:Point; radius:number; top:number; bottom:number; visibility:number;
 /** Degrees, exactly the same convention as spherical-face.headBasis. */
 gaze:{yaw:number;pitch:number;roll:number};
}
/** Semantic head-local crown and host-relative lower mount, never screen contour chasing. */
export const headMountCapabilities = Object.fromEntries(["head.crown","head.sides","head.forehead","head.cheeks","head.lower.front","head.lower.sides","character.orbit"].map(id=>[id,{kind:"frame" as const,version:1 as const}]));
export function headMounts(input:HeadMountInput):MountFrames {
 const {center,radius,top,bottom,gaze}=input;
 const basis=headBasis(gaze),visibility=Math.max(0,Math.min(1,input.visibility));
 // A lower-front location in head space; project its position and basis together.
 const lowerHeight=Math.max(radius*.4,bottom-center.y)*.85,lowerDepth=radius*.55;
 const lower={x:center.x+basis.down[0]*lowerHeight+basis.f[0]*lowerDepth,y:center.y+basis.down[1]*lowerHeight+basis.f[1]*lowerDepth};
 // Semantic origin only; each attachment owns its installation offset.
 const origin={x:center.x-basis.down[0]*top*.91,y:center.y-basis.down[1]*top*.91};
 const volume:VolumeMount={originDepth:-basis.down[2]*top*.91/radius,origin,scale:radius,right:basis.right,down:basis.down,forward:basis.f};
 const at=(x:number,y:number,z:number,surface=false):MountFrames[string]=>{
  const origin={x:center.x+radius*(x*basis.right[0]+y*basis.down[0]+z*basis.f[0]),y:center.y+radius*(x*basis.right[1]+y*basis.down[1]+z*basis.f[1])};
  return {kind:'frame',version:1,visibility,...(surface?{surface:[x,y] as const}:{}),volume:{origin,originDepth:x*basis.right[2]+y*basis.down[2]+z*basis.f[2],scale:radius,right:basis.right,down:basis.down,forward:basis.f},matrix:[radius*basis.right[0],radius*basis.right[1],radius*basis.down[0],radius*basis.down[1],origin.x,origin.y]};
 };
 const pair=(x:number,y:number,z:number,surface=false)=>({...at(0,0,0),members:{left:at(-x,y,z,surface),right:at(x,y,z,surface)}});
 // Paired side attachments sit on different tangent planes, not one frontal card.
 const sides=pair(.73,-top/radius*.65,.28);
 for(const [name,angle] of [['left',-.48],['right',.48]] as const){
  const member=sides.members[name],v=member.volume!,c=Math.cos(angle),s=Math.sin(angle);
  const right=basis.right.map((r,i)=>r*c-basis.f[i]!*s);
  const forward=basis.right.map((r,i)=>r*s+basis.f[i]!*c);
  member.volume={...v,right,forward};
  member.matrix=[radius*right[0]!,radius*right[1]!,radius*basis.down[0],radius*basis.down[1],v.origin.x,v.origin.y];
 }
 return {
  'head.sides':sides,
  'head.forehead':at(0,-Math.min(.62,top/radius*.62),Math.sqrt(1-Math.min(.62,top/radius*.62)**2),true),
  'head.cheeks':pair(.67,.25,Math.sqrt(1-.67**2-.25**2),true),
  'head.lower.sides':pair(.83,.65,.15),
  'character.orbit':at(0,0,0),
  'head.crown':{kind:'frame',version:1,visibility,volume,matrix:[radius*basis.right[0],radius*basis.right[1],radius*basis.down[0],radius*basis.down[1],origin.x,origin.y]},
  'head.lower.front':{...at(0,lowerHeight/radius,lowerDepth/radius),matrix:[radius*basis.right[0],radius*basis.right[1],radius*basis.down[0],radius*basis.down[1],lower.x,lower.y]},
 };
}
