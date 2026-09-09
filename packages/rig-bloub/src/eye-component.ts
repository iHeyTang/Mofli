import {closedPath} from './vendor/shape.js';
import {pupilPath} from './eye-geometry.js';
/** Rig-local eye pose, resolved at expression endpoints, before interpolation. */
export interface EyeComponentPose {
 width:number; upper:number; lower:number; corner:number; heart:number;
}
interface EyeInput {w:number;h:number;bend?:number;eyeHeart?:number}
export function resolveEyeComponent(e:EyeInput,socket=false):EyeComponentPose {
 const curve=!!e.bend;
 // Socket projection is constant; closed-lid dimensions compensate in the pose.
 const width=e.w*(socket&&curve?.5:1);
 const height=e.h*(socket&&curve?.7/.85:1);
 const bend=(e.bend??0)*(socket?1/.85:1);
 const corner=curve ? Math.min(height*.5,width*.24) : Math.min(width*.18,height*.5,.05);
 return {width,upper:-bend-height/2,lower:-bend+height/2,corner,heart:e.eyeHeart??0};
}
export function blendEyeComponent(a:EyeComponentPose,b:EyeComponentPose,t:number):EyeComponentPose {
 const mix=(key:keyof EyeComponentPose)=>a[key]+(b[key]-a[key])*t;
 return {width:mix('width'),upper:mix('upper'),lower:mix('lower'),corner:mix('corner'),heart:mix('heart')};
}
/** Upper and lower lids have separate cubic controls and permanent round corners. */
export function renderEyeComponent(p:EyeComponentPose,scale=100):string {
 const w=p.width*scale, gap=(p.lower-p.upper)*scale;
 const r=Math.min(p.corner*scale,gap/2,w/4);
 const a=Math.max(.001,w/2-r);
 // A smile is a round-ended stroke around a shallow parabola. Its end caps
 // follow the curve tangent, instead of attaching horizontal bulbs to it.
 const bend=-(p.upper+p.lower)*scale/2;
 const b=Math.sign(bend)*Math.min(Math.abs(bend),a*.8);
 const normal=(x:number)=>{const slope=2*b*x/(a*a),n=Math.hypot(1,slope);return {x:-slope/n,y:1/n}};
 const edge=(x:number,side:number)=>{const n=normal(x);return {x:x+side*r*n.x,y:-b*(1-x*x/(a*a))+side*r*n.y}};
 const cap=(x:number,t:number)=>{const n=normal(x),angle=Math.atan2(n.y,n.x)+(x>0?-Math.PI:0)+t*Math.PI;return {x:x+r*Math.cos(angle),y:r*Math.sin(angle)}};
 const tube=[
  ...Array.from({length:6},(_,i)=>edge(a*i/6,-1)),
  ...Array.from({length:12},(_,i)=>cap(a,i/12)),
  ...Array.from({length:12},(_,i)=>edge(a-2*a*i/12,1)),
  ...Array.from({length:12},(_,i)=>cap(-a,i/12)),
  ...Array.from({length:6},(_,i)=>edge(-a+a*i/6,-1)),
 ];
 // Opening adds a convex oval envelope, while the smile's bend relaxes.
 // Keep the same contour samples throughout; no path/layer replacement.
 const opening=Math.max(0,Math.min(1,1-2*r/Math.max(.001,gap)));
 const points=tube.map((point,i)=>{
  const theta=-Math.PI/2+i/48*Math.PI*2;
  return {x:point.x*(1-opening)+w/2*Math.cos(theta)*opening,
   y:point.y*(1-opening)+gap/2*Math.sin(theta)*opening};
 });
 if(p.heart>0){
  const heartD=pupilPath(0,0,p.width*scale/2,(p.lower-p.upper)*scale/2,1);
  const commands=heartD.match(/[MC][^MCZ]+/g)!;
  const hearts=commands.slice(0,48).map(c=>c.slice(1).trim().split(/[ ,]+/).map(Number).slice(-2));
  points.forEach((point,i)=>{point.x+=(hearts[i]![0]!-point.x)*p.heart;point.y+=(hearts[i]![1]!-point.y)*p.heart;});
 }
 return closedPath(points);
}
