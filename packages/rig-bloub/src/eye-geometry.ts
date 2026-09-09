import { closedPath } from './vendor/shape.js';
/** Rounded tube along a shallow arch; constant thickness and semicircular ends. */
export function roundedEye(w:number,h:number,bend:number):string {
 const r=Math.min(w,h)/2, half=Math.max(.01,w/2-r);
 const center=(u:number)=>({x:(u*2-1)*half,y:-bend*(1-(u*2-1)**2)});
 const normal=(u:number)=>{const slope=2*bend*(u*2-1)/half;const n=Math.hypot(slope,1);return {x:slope/n,y:-1/n};};
 const pts=[];
 for(let j=0;j<=16;j++){const c=center(j/16),n=normal(j/16);pts.push({x:c.x+r*n.x,y:c.y+r*n.y});}
 const cap=(u:number,angle:number)=>{const c=center(u);for(let j=1;j<=10;j++){const a=angle+j/10*Math.PI;pts.push({x:c.x+r*Math.cos(a),y:c.y+r*Math.sin(a)});}};
 const right=normal(1);cap(1,Math.atan2(right.y,right.x));
 for(let j=15;j>=0;j--){const c=center(j/16),n=normal(j/16);pts.push({x:c.x-r*n.x,y:c.y-r*n.y});}
 const left=normal(0);cap(0,Math.atan2(-left.y,-left.x));
 return closedPath(pts);
}
/** Rounded lobes, shallow notch, and a horizontal tangent at the broad lower end. */
const heartSegments = [
 [[0,-.4],[.18,-.4],[.22,-.82],[.58,-.82]],
 [[.58,-.82],[1.12,-.82],[1.12,-.14],[.78,.24]],
 [[.78,.24],[.48,.60],[.20,.87],[0,.87]],
 [[0,.87],[-.20,.87],[-.48,.60],[-.78,.24]],
 [[-.78,.24],[-1.12,-.14],[-1.12,-.82],[-.58,-.82]],
 [[-.58,-.82],[-.22,-.82],[-.18,-.4],[0,-.4]],
];
export function pupilPath(x:number,y:number,rx:number,ry:number,heart:number):string {
 return closedPath(Array.from({length:48},(_,i)=>{
  const a=i/48*Math.PI*2,t=(i%8)/8,u=1-t,p=heartSegments[Math.floor(i/8)]!;
  const coord=(axis:number)=>u*u*u*p[0]![axis]!+3*u*u*t*p[1]![axis]!+3*u*t*t*p[2]![axis]!+t*t*t*p[3]![axis]!;
  return {x:x+rx*(Math.sin(a)*(1-heart)+coord(0)*heart),y:y+ry*(-Math.cos(a)*(1-heart)+coord(1)*heart)};
 }));
}

export interface EyeGeometry {w:number;h:number;bend:number;curve:number;heart:number}
/**
 * One eyelid aperture: upper/lower lids share a horizontal parameter. Height
 * separates the lids, bend lifts their common centerline. A round rim keeps
 * the closed ends soft. No perimeter-to-perimeter morph is used for opening.
 */
export function expressiveEye(g:EyeGeometry,socket=false):{d:string;sx:number;sy:number} {
 const mix=Math.max(0,Math.min(1,g.curve));
 const rim=Math.min(g.w,g.h,10)/2;
 const halfWidth=Math.max(.001,g.w/2-rim);
 const opening=Math.max(.001,g.h/2-rim);
 // Limit curvature so the inner rounded rim cannot fold over itself.
 const maxBend=.7*halfWidth*halfWidth/Math.max(.001,2*rim);
 const bend=Math.max(-maxBend,Math.min(maxBend,g.bend));
 const heart=Math.max(0,Math.min(1,g.heart));
 const lid=(u:number,side:number)=>{
  const q=2*u-1,arch=1-q*q;
  const y=-bend*arch+side*opening*arch*arch;
  const slope=(2*bend*q-side*4*opening*q*arch)/halfWidth;
  const length=Math.hypot(slope,1);
  return {x:q*halfWidth-side*rim*slope/length,y:y+side*rim/length};
 };
 // Explicit semicircular caps avoid undersampling a degenerate closed ellipse.
 // Upper and lower lids retain their own ordered samples throughout opening.
 const perimeter=[];
 for(let j=0;j<16;j++)perimeter.push(lid(j/16,-1));
 const rightAngle=Math.atan2(-1,2*bend/halfWidth);
 for(let j=0;j<8;j++){const a=rightAngle+j/8*Math.PI;perimeter.push({x:halfWidth+rim*Math.cos(a),y:rim*Math.sin(a)});}
 for(let j=0;j<16;j++)perimeter.push(lid(1-j/16,1));
 const leftAngle=Math.atan2(1,2*bend/halfWidth);
 for(let j=0;j<8;j++){const a=leftAngle+j/8*Math.PI;perimeter.push({x:-halfWidth+rim*Math.cos(a),y:rim*Math.sin(a)});}
 const ordered=perimeter.slice(8).concat(perimeter.slice(0,8));
 const points=ordered.map((lidPoint,i)=>{
  const section=heartSegments[Math.floor(i/8)]!,t=(i%8)/8,u=1-t;
  const coordinate=(axis:number)=>u*u*u*section[0]![axis]!+3*u*u*t*section[1]![axis]!+3*u*t*t*section[2]![axis]!+t*t*t*section[3]![axis]!;
  // As the aperture opens, its rim joins the oval envelope; side caps must
  // not protrude from fully open eyes. Both use the same upper/lower ordering.
  const angle=i/48*Math.PI*2,round=(1-mix)*(1-mix);
  const x=lidPoint.x*(1-round)+Math.sin(angle)*g.w/2*round;
  const y=lidPoint.y*(1-round)-Math.cos(angle)*g.h/2*round;
  return {x:x*(1-heart)+coordinate(0)*g.w/2*heart,y:y*(1-heart)+coordinate(1)*g.h/2*heart};
 });
 return {d:closedPath(points),sx:socket?2-mix:1,sy:socket?.85+.15*mix:1};
}
