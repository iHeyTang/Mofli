import {PetEngine,validateSkin,type Skin,type Rig,type RigConfig,type RigPose} from './index.js';
import {composeAttachments,type Attachment,type AttachmentInstance} from './attachments.js';
export interface PetConfig {
 version:1; skin:Skin; rigConfig:RigConfig; pose:RigPose;
 attachments:{id:string;type:string;version:1;parameters?:Record<string,number>}[];
}
/** Explicit trusted implementation registry; configuration never imports code. */
export class PetRegistry {
 private rigs=new Map<string,Rig>();private parts=new Map<string,Attachment>();
 registerRig(rig:Rig){if(this.rigs.has(rig.id))throw new Error(`Duplicate rig: ${rig.id}`);this.rigs.set(rig.id,rig);return this}
 registerAttachment(part:Attachment){if(this.parts.has(part.id))throw new Error(`Duplicate attachment: ${part.id}`);this.parts.set(part.id,part);return this}
 resolve(value:unknown):{config:PetConfig;engine:PetEngine;instances:AttachmentInstance[]}{
  const v=value as PetConfig;
  if(!v||typeof v!=='object'||v.version!==1||Object.keys(v).some(k=>!['version','skin','rigConfig','pose','attachments'].includes(k)))throw new Error('Invalid pet configuration');
  const rig=this.rigs.get(v.skin?.rig);if(!rig)throw new Error(`Rig not installed: ${v.skin?.rig}`);
  const skin=validateSkin(v.skin,rig);
  for(const field of [v.rigConfig,v.pose])if(!field||typeof field!=='object'||Array.isArray(field)||Object.values(field).some(n=>typeof n!=='number'||!Number.isFinite(n)))throw new Error('Invalid pet parameters');
  if(!Array.isArray(v.attachments)||v.attachments.length>16)throw new Error('Invalid attachment list');
  const instances=v.attachments.map(ref=>{
   if(!ref||typeof ref!=='object'||ref.version!==1||Object.keys(ref).some(k=>!['id','type','version','parameters'].includes(k)))throw new Error('Invalid attachment reference');
   const attachment=this.parts.get(ref.type);if(!attachment)throw new Error(`Attachment not installed: ${ref.type}`);
   return {id:ref.id,attachment,parameters:ref.parameters===undefined?undefined:structuredClone(ref.parameters)};
  });
  const engine=new PetEngine(rig,skin,{rigConfig:v.rigConfig,pose:v.pose});
  composeAttachments(engine.sample(0,true),instances); // atomic validation, including compatibility and conflicts
  const config:PetConfig={version:1,skin:engine.getSkin(),rigConfig:engine.getRigConfig(),pose:engine.getPose(),attachments:structuredClone(v.attachments)};
  return {config,engine,instances};
 }
 create(value:unknown){
  const {config,engine,instances}=this.resolve(value);
  return {engine,sample:(time:number,reducedMotion=false)=>composeAttachments(engine.sample(time,reducedMotion),instances),exportConfig:():PetConfig=>({...structuredClone(config),skin:engine.getSkin(),rigConfig:engine.getRigConfig(),pose:engine.getPose()})};
 }
 export(engine:PetEngine,attachments:PetConfig['attachments']):PetConfig {
  return this.resolve({version:1,skin:engine.getSkin(),rigConfig:engine.getRigConfig(),pose:engine.getPose(),attachments}).config;
 }
}
