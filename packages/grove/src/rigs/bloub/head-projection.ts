/** Bounded 2.5D silhouette approximation, not a reconstruction of a 3D mesh. */
export function projectHead(radii:readonly number[],gaze:{yaw:number;pitch:number;roll:number},depth=.65){
 const n=radii.length,tau=Math.PI*2;
 const at=(angle:number)=>{const x=((angle/tau*n)%n+n)%n,i=Math.floor(x);return radii[i]!+(radii[(i+1)%n]!-radii[i]!)*(x-i)};
 const bounded=(v:number)=>Math.tanh(v*Math.PI/180);
 const y=bounded(gaze.yaw),p=bounded(gaze.pitch),roll=gaze.roll*Math.PI/180;
 const mean=radii.reduce((a,b)=>a+b,0)/n;
 const variance=Math.sqrt(radii.reduce((a,b)=>a+(b-mean)**2,0)/n)/mean;
 // A sphere keeps its outline; distinctive profiles progressively reveal depth.
 const identity=Math.min(1,variance*9);
 const sx=Math.sqrt(1-(1-depth*depth)*Math.sin(y)**2);
 const sy=Math.sqrt(1-(1-depth*depth)*Math.sin(p)**2);
 return radii.map((_,i)=>{
  const angle=i/n*tau-roll,c=Math.cos(angle),s=Math.sin(angle);
  const local=Math.atan2(s/sy,c/sx);
  const feature=local+identity*(y*.32*Math.sin(local)-p*.25*Math.cos(local));
  const scale=1/Math.hypot(c/sx,s/sy);
  const volume=1+identity*(.10*y*Math.cos(local)-.08*p*Math.sin(local));
  return at(feature)*((1-identity)+identity*scale)*volume;
 });
}
