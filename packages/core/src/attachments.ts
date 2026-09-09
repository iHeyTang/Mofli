import type {Frame,Point,Shape} from './index.js';
import {compose2D,type Affine2D,type SurfacePose} from './bindings.js';
export interface VolumeMount {originDepth?:number;origin:Point;scale:number;right:readonly number[];down:readonly number[];forward:readonly number[]}
export interface AttachmentContext {project(point:readonly [number,number,number]):Point & {depth:number}}
export interface MountFrame {volume?:VolumeMount;kind:'frame';version:1;matrix:Affine2D;visibility:number}
export type MountFrames=Record<string,MountFrame>;
export interface Attachment {parameters?:Record<string,{min:number;max:number;default:number}>;id:string;mount:string;slot:string;volume?:boolean;sample(context:AttachmentContext,parameters:Readonly<Record<string,number>>):(Shape & {slot?:string})[]}
export interface AttachmentInstance {id:string;attachment:Attachment;parameters?:Record<string,number>}
/** A small first protocol: rigid mounts and flat shapes; no arbitrary SVG/resources. */
export function composeAttachments(frame:Frame,instances:readonly AttachmentInstance[]):Frame {
 if(!instances.length)return frame;
 const ids=new Set<string>(),occupied=new Set<string>(),insertions=new Map<number,Shape[]>();
 for(const {id,attachment:a,parameters={}} of instances){
  if(!/^[\w-]+$/.test(id)||ids.has(id))throw new Error('Invalid or duplicate attachment instance');ids.add(id);
  const m=frame.mounts?.[a.mount],slot=frame.slots?.[a.slot];
  if(!m||m.kind!=='frame'||m.version!==1||slot===undefined)throw new Error(`Incompatible attachment: ${a.id}`);
  if(occupied.has(a.mount))throw new Error(`Mount occupied: ${a.mount}`);occupied.add(a.mount);
  if(!m.matrix.every(Number.isFinite)||!Number.isFinite(m.visibility)||m.visibility<0||m.visibility>1||!Number.isInteger(slot)||slot<0||slot>frame.shapes.length)throw new Error('Invalid mount frame');
  if(a.volume&&!m.volume)throw new Error(`Attachment requires volume mount: ${a.id}`);
  const context:AttachmentContext={project:([x,y,z])=>{
   const v=m.volume;if(!v)throw new Error('Missing volume mount');
   return {x:v.origin.x+v.scale*(x*v.right[0]!+y*v.down[0]!+z*v.forward[0]!),y:v.origin.y+v.scale*(x*v.right[1]!+y*v.down[1]!+z*v.forward[1]!),depth:(v.originDepth??0)+x*v.right[2]!+y*v.down[2]!+z*v.forward[2]!};
  }};
  if(!parameters||typeof parameters!=='object'||Array.isArray(parameters)||Object.keys(parameters).some(k=>!Object.hasOwn(a.parameters??{},k)))throw new Error('Unknown attachment parameter');
  const resolved:Record<string,number>={};
  for(const [key,rule] of Object.entries(a.parameters??{})){
   const value=parameters[key]??rule.default;
   if(typeof value!=='number'||!Number.isFinite(value)||value<rule.min||value>rule.max)throw new Error(`Invalid attachment parameter: ${key}`);
   resolved[key]=value;
  }
  const shapes=a.sample(context,resolved).map(s=>{
   if(s.mask||s.paint)throw new Error('Attachment resources are not supported in v1');
   return {...s,id:`attachment-${id}-${s.id}`,transform:compose2D(a.volume?[1,0,0,1,0,0]:m.matrix,s.transform??[1,0,0,1,0,0]),attrs:{...s.attrs,opacity:Number(s.attrs.opacity??1)*m.visibility}};
  });
  for(const shape of shapes){
   const destination=shape.slot?frame.slots?.[shape.slot]:slot;
   if(destination===undefined||destination<0||destination>frame.shapes.length)throw new Error('Unknown attachment render slot');
   insertions.set(destination,[...(insertions.get(destination)??[]),shape]);
  }
 }
 const shapes:Shape[]=[];
 for(let i=0;i<=frame.shapes.length;i++){shapes.push(...insertions.get(i)??[]);if(i<frame.shapes.length)shapes.push(frame.shapes[i]!)}
 const box=frame.viewBox??frame.bounds,margin=65;
 const expanded={x:box.x-margin,y:box.y-margin,width:box.width+2*margin,height:box.height+2*margin};
 return {...frame,shapes,viewBox:expanded,bounds:expanded};
}
/** Utility for rigs: sample a deforming closed contour in a head-local direction. */
export function contourMounts(points:readonly Point[],visibility:number,pose:SurfacePose|number=0):MountFrames {
 const {yaw,pitch,roll}=typeof pose==='number'?{yaw:0,pitch:0,roll:pose}:pose;
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const center=points.reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length}),{x:0,y:0});
 const c=Math.cos(roll),s=Math.sin(roll);
 const span=Math.max(1,Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*.5;
 const mount=(direction:number,depth:number):MountFrame=>{
  const dx=Math.cos(direction+roll),dy=Math.sin(direction+roll);
  let distance=0;
  for(let i=0;i<points.length;i++){
   const a=points[i]!,b=points[(i+1)%points.length]!,ex=b.x-a.x,ey=b.y-a.y;
   const den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
   const ax=a.x-center.x,ay=a.y-center.y;
   const t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;
   if(t>=0&&u>=0&&u<=1)distance=Math.max(distance,t);
  }
  const p={x:center.x+dx*distance,y:center.y+dy*distance};
  // Project both local basis vectors, not just the attachment's screen position.
  const x=span*depth*sy,y=Math.sin(direction)*distance*(cp-1)+span*depth*cy*sp;
  let px=p.x+x*c-y*s,py=p.y+x*s+y*c;
  // Keep the hat root on the contour after its depth-driven lateral movement.
  if(direction<0){
   const vx=px-center.x,vy=py-center.y,length=Math.hypot(vx,vy)||1,nx=vx/length,ny=vy/length;
   let hit=0;
   for(let i=0;i<points.length;i++){
    const a=points[i]!,b=points[(i+1)%points.length]!,ex=b.x-a.x,ey=b.y-a.y,den=nx*ey-ny*ex;
    if(Math.abs(den)<1e-9)continue;
    const ax=a.x-center.x,ay=a.y-center.y,t=(ax*ey-ay*ex)/den,u=(ax*ny-ay*nx)/den;
    if(t>=0&&u>=0&&u<=1)hit=Math.max(hit,t);
   }
   px=center.x+nx*hit;py=center.y+ny*hit;
  }
  return {kind:'frame',version:1,matrix:[span*(cy*c-sy*sp*s),span*(cy*s+sy*sp*c),-span*cp*s,span*cp*c,px,py],visibility:Math.max(0,Math.min(1,visibility))};
 };
 return {'head.crown':mount(-Math.PI/2,.30),'head.lower.front':mount(Math.PI/2,.65)};
}

/** Rigid mount interpolation uses decomposed rotation, never collapsing matrix axes. */
export function blendMountFrames(a:MountFrames={},b:MountFrames={},t:number):MountFrames {
 const result:MountFrames={};
 for(const id of new Set([...Object.keys(a),...Object.keys(b)])){
  const x=a[id]??{...b[id]!,visibility:0},y=b[id]??{...a[id]!,visibility:0};
  const u=x.matrix,v=y.matrix;
  const angle=Math.atan2(u[1],u[0]),delta=Math.atan2(Math.sin(Math.atan2(v[1],v[0])-angle),Math.cos(Math.atan2(v[1],v[0])-angle));
  const r=angle+delta*t,c=Math.cos(r),s=Math.sin(r),mix=(a:number,b:number)=>a+(b-a)*t;
  const components=(m:Affine2D)=>{
   const sx=Math.max(1e-9,Math.hypot(m[0],m[1]));
   return {sx,shear:(m[0]*m[2]+m[1]*m[3])/sx,sy:(m[0]*m[3]-m[1]*m[2])/sx};
  };
  const du=components(u),dv=components(v),sx=mix(du.sx,dv.sx),sy=mix(du.sy,dv.sy),shear=mix(du.shear,dv.shear);
  let volume:VolumeMount|undefined;
  if(x.volume&&y.volume){
   const a=x.volume,b=y.volume,vector=(u:readonly number[],v:readonly number[])=>u.map((n,i)=>mix(n,v[i]!));
   const normalize=(v:number[])=>{const length=Math.hypot(...v);return length>1e-8?v.map(n=>n/length):[...a.right]};
   const right=normalize(vector(a.right,b.right)),d=vector(a.down,b.down),dot=d.reduce((v,n,i)=>v+n*right[i]!,0);
   const down=normalize(d.map((n,i)=>n-dot*right[i]!));
   const forward=[right[1]!*down[2]!-right[2]!*down[1]!,right[2]!*down[0]!-right[0]!*down[2]!,right[0]!*down[1]!-right[1]!*down[0]!];
   volume={originDepth:mix(a.originDepth??0,b.originDepth??0),origin:{x:mix(a.origin.x,b.origin.x),y:mix(a.origin.y,b.origin.y)},scale:mix(a.scale,b.scale),right,down,forward};
  } else volume=x.volume??y.volume;
  result[id]={...(volume?{volume}:{}),kind:'frame',version:1,visibility:mix(x.visibility,y.visibility),matrix:[c*sx,s*sx,c*shear-s*sy,s*shear+c*sy,mix(u[4],v[4]),mix(u[5],v[5])]};
 }
 return result;
}
