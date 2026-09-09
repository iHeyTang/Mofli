import {headBasis} from './spherical-face.js';
import type {MountFrames,VolumeMount} from './attachments.js';
import type {Point} from './index.js';
export interface HeadMountInput {
  center:Point; radius:number; top:number; bottom:number; visibility:number;
 /** Degrees, exactly the same convention as spherical-face.headBasis. */
 gaze:{yaw:number;pitch:number;roll:number};
}
/** Semantic head-local crown and host-relative lower mount, never screen contour chasing. */
export function headMounts(input:HeadMountInput):MountFrames {
 const {center,radius,top,bottom,gaze}=input;
 const basis=headBasis(gaze),visibility=Math.max(0,Math.min(1,input.visibility));
 // A lower-front location in head space; project its position and basis together.
 const lowerHeight=Math.max(radius*.4,bottom-center.y)*.85,lowerDepth=radius*.55;
 const lower={x:center.x+basis.down[0]*lowerHeight+basis.f[0]*lowerDepth,y:center.y+basis.down[1]*lowerHeight+basis.f[1]*lowerDepth};
 // Semantic origin only; each attachment owns its installation offset.
 const origin={x:center.x-basis.down[0]*top*.91,y:center.y-basis.down[1]*top*.91};
 const volume:VolumeMount={originDepth:-basis.down[2]*top*.91/radius,origin,scale:radius,right:basis.right,down:basis.down,forward:basis.f};
 return {
  'head.crown':{kind:'frame',version:1,visibility,volume,matrix:[radius*basis.right[0],radius*basis.right[1],radius*basis.down[0],radius*basis.down[1],origin.x,origin.y]},
  'head.lower.front':{kind:'frame',version:1,visibility,matrix:[radius*basis.right[0],radius*basis.right[1],radius*basis.down[0],radius*basis.down[1],lower.x,lower.y]},
 };
}
