import type {EyeCfg} from './vendor/states.js';
export interface BloubDesign {version:1;contour:number[];expressions:[EyeCfg,EyeCfg][];motion:string}
export function validateBloubDesign(value:unknown):BloubDesign {
 const d=value as BloubDesign;
 if(!d||typeof d!=='object'||Object.keys(d).some(k=>!['version','contour','expressions','motion'].includes(k))||d.version!==1||!['mellow','spry','steady'].includes(d.motion))throw new Error('Invalid Bloub design');
 if(!Array.isArray(d.contour)||d.contour.length!==64||d.contour.some(r=>typeof r!=='number'||!Number.isFinite(r)||r<.3||r>1.8))throw new Error('Invalid character contour');
 if(d.contour.some((r,i)=>Math.abs(r-d.contour[(i+1)%64]!)>.3))throw new Error('Character contour is too sharp');
 const rules:Record<string,[number,number]>={w:[.01,1],h:[.01,1.5],open:[0,1],tilt:[-90,90],pupil:[0,3],pupilX:[-3,3],pupilY:[-3,3],pupilAlpha:[0,1],heart:[0,1],eyeHeart:[0,1],bend:[-.4,.4],curveWeight:[0,1]};
 if(!Array.isArray(d.expressions)||d.expressions.length!==19)throw new Error('Design requires 19 expression pairs');
 for(const pair of d.expressions){
  if(!Array.isArray(pair)||pair.length!==2)throw new Error('Invalid eye pair');
  for(const eye of pair){
   if(!eye||typeof eye!=='object'||!['w','h','open'].every(k=>Object.hasOwn(eye,k)))throw new Error('Incomplete eye');
   for(const [key,v] of Object.entries(eye)){const rule=rules[key];if(!rule||typeof v!=='number'||!Number.isFinite(v)||v<rule[0]||v>rule[1])throw new Error(`Invalid eye parameter: ${key}`)}
  }
 }
 return structuredClone(d);
}
