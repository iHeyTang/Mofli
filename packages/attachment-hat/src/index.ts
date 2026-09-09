import type {Attachment,AttachmentContext,Shape} from '@mofli/core';
type V=readonly [number,number,number];
/** A low-poly solid of revolution; every visible surface uses the host's head basis. */
export const hat:Attachment={parameters:{hoverHeight:{min:.25,max:1,default:.45}},id:'hat',mount:'head.crown',slot:'head.overlay',volume:true,sample:({project:mountProject}:AttachmentContext,parameters):(Shape & {slot?:string})[]=>{
 // Authored hover offset in head-local units, not runtime collision correction.
 const hoverHeight=parameters.hoverHeight??.45;
 const project=(p:V)=>mountProject([p[0],p[1]-hoverHeight,p[2]]);
 const n=48;
 const ring=(radius:number,height:number):V[]=>Array.from({length:n},(_,i)=>[radius*Math.cos(i*2*Math.PI/n),height,radius*.78*Math.sin(i*2*Math.PI/n)] as V);
 const lower=ring(.43,0),upper=ring(.34,-.46),brim=ring(.62,-.005),band=ring(.412,-.095),brimBottom=ring(.62,.025);
 const pieces:{id:string;vertices:V[];fill:string}[]=[];
 const inner=ring(.43,-.005);
 for(let i=0;i<n;i++){
  const j=(i+1)%n;
  pieces.push({id:`brim-top-${i}`,vertices:[inner[i]!,brim[i]!,brim[j]!,inner[j]!],fill:'#52664e'});
  pieces.push({id:`brim-under-${i}`,vertices:[[0,.025,0],brimBottom[j]!,brimBottom[i]!],fill:'#465940'});
  pieces.push({id:`crown-${i}`,vertices:[band[i]!,band[j]!,upper[j]!,upper[i]!],fill:'#70866a'});
  pieces.push({id:`brim-edge-${i}`,vertices:[brim[i]!,brimBottom[i]!,brimBottom[j]!,brim[j]!],fill:'#52664e'});
  pieces.push({id:`band-${i}`,vertices:[lower[i]!,lower[j]!,band[j]!,band[i]!],fill:'#d5b18b'});
 }
 pieces.push({id:'top',vertices:upper,fill:'#82977c'});
 return pieces.map(p=>({...p,points:p.vertices.map(project)}))
 .sort((a,b)=>a.points.reduce((v,p)=>v+p.depth/a.points.length,0)-b.points.reduce((v,p)=>v+p.depth/b.points.length,0))
 .flatMap(p=>{
  const [a,b,c]=p.points;
  const facing=(b!.x-a!.x)*(c!.y-a!.y)-(b!.y-a!.y)*(c!.x-a!.x);
  return [{id:p.id,slot:'head.overlay',kind:'path' as const,attrs:{opacity:facing>1e-7?1:0,d:p.points.map((v,i)=>`${i?'L':'M'}${v.x.toFixed(4)} ${v.y.toFixed(4)}`).join(' ')+' Z',fill:p.fill,stroke:p.fill,'stroke-width':.45,'stroke-linejoin':'round'}}];
 });
}};
