import {steadyExpression} from "./steady-expression.js";
import {resolveEyeComponent} from "./eye-component.js";
import type { BotExpression } from './vendor/expressions.js';
import type { EyeCfg } from './vendor/states.js';
export type CharacterMood = 'rest'|'curious'|'happy'|'startled'|'irritated'|'love';
/** Rig-owned bounded expression vocabulary. Skins select a profile, never supply code. */
export function characterExpression(base: BotExpression, style: string, mood: CharacterMood): BotExpression {
 if(base.eyeCatalog){
  const index={rest:0,curious:12,happy:5,startled:3,irritated:17,love:18}[mood];
  const eyes=structuredClone(base.eyeCatalog[index]!);
  for(const eye of eyes)eye.lid=resolveEyeComponent(eye,style==='steady');
  return {...base,eyes};
 }
 if(style==='steady')return steadyExpression(base,{rest:-1,curious:11,happy:4,startled:2,irritated:16,love:17}[mood]);
 const e=(w:number,h:number,open=1,tilt=0,pupil=1):EyeCfg=>({w,h,open,tilt,pupil});
 const table:Record<string,Record<CharacterMood,[EyeCfg,EyeCfg]>>={
  mellow:{love:[e(.24,.24),e(.24,.24)],rest:[e(.14,.19),e(.14,.19)],curious:[e(.18,.26),e(.16,.22)],happy:[e(.25,.075,1,-12),e(.25,.075,1,12)],startled:[e(.29,.34),e(.29,.34)],irritated:[e(.23,.13,.6,12),e(.23,.13,.6,-12)]},
  spry:{love:[e(.23,.3),e(.2,.24)],rest:[e(.14,.2),e(.13,.17)],curious:[e(.23,.34),e(.18,.18,.65)],happy:[e(.25,.085,1,-20),e(.2,.2,.35,14)],startled:[e(.3,.4),e(.23,.3)],irritated:[e(.26,.13,.7,25),e(.19,.23,.45,-15)]},
  steady:{love:[e(.32,.64,1,0,1.65),e(.32,.64,1,0,1.65)],rest:[e(.29,.6,1,0,1.05),e(.29,.6,1,0,1.05)],curious:[e(.29,.6,1,-5,1.25),e(.29,.6,.7,5,1.25)],happy:[e(.3,.27,1,-8,.85),e(.3,.27,1,8,.85)],startled:[e(.32,.65,1,0,.55),e(.32,.65,1,0,.55)],irritated:[e(.29,.6,.38,0,.9),e(.29,.6,.38,0,.9)]}
 };
 const pair=table[style]?.[mood];if(!pair)return base;
 if(mood==='happy') for(const eye of pair){eye.pupilAlpha=0;eye.bend=style==='mellow'?.10:style==='spry'?.13:.12;eye.tilt=0;eye.h=style==='steady'?.09:.10;eye.open=1;if(style==='steady')eye.w=.42;}
 if(style==='steady' && mood==='irritated') for(const eye of pair)eye.pupilAlpha=0;
 if(mood==='love') for(const eye of pair){if(style==='steady')eye.heart=1;else {eye.eyeHeart=1;eye.w=.32;eye.h=.34;}} 
 for(const eye of pair)eye.lid=resolveEyeComponent(eye,style==='steady');
 const roll=style==='spry'?{rest:12,curious:-16,happy:8,startled:-5,irritated:12,love:-7}[mood]:0;
 return {...base,eyes:pair,character:style,gaze:mood==='rest'?base.gaze:{yaw:mood==='curious'?style==='steady'?8:15:mood==='irritated'?-12:0,pitch:mood==='startled'?-5:mood==='happy'?7:0,roll}};
}

/** Keep socket openings plump and separated even for inherited expressions. */
export function softSocketExpression(base: BotExpression): BotExpression {
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 return {...base,gaze:{yaw:clamp(base.gaze.yaw,-14,14),pitch:clamp(base.gaze.pitch,-12,12),roll:clamp(base.gaze.roll,-8,8)},eyes:base.eyes.map(e=>({...e,w:clamp(e.w,.23,.32),h:clamp(e.h,.32,.65),tilt:clamp(e.tilt??0,-10,10),open:Math.max(.48,e.open)})) as BotExpression['eyes']};
}

/** Authored expression pairs: arcs, closed lids, open sockets and gaze can differ per eye. */
export function characterCatalogExpression(base:BotExpression,style:string,index:number):BotExpression {
 if(style==='steady')return steadyExpression(base,index);
 const socket=style==='steady', spry=style==='spry';
 const eye=(w:number,h:number,extras:Partial<EyeCfg>={}):EyeCfg=>({w,h,open:1,pupil:1,...extras});
 const dot=()=>eye(socket?.28:.17,socket?.55:.24);
 const arc=(bend=.10)=>eye(socket?.40:.27,.10,{bend,pupilAlpha:0});
 const shut=()=>eye(socket?.29:.22,.10,{pupilAlpha:0});
 const left=dot(),right=dot();let pair:[EyeCfg,EyeCfg]=[left,right];
 switch(index){
  case 1: // Focus: larger pupil; companion eye watches quietly.
   left.pupil=1.4;right.pupil=1.25;right.open=spry?.65:.9;break;
  case 3: // Excitement: one smiling eye, one wide eye (heart pupil for stone).
   pair=[arc(.12),eye(socket?.31:.28,socket?.6:.34,{pupil:1.45,heart:socket?1:0})];break;
  case 5: // Laughter: broad closed curves, slightly different heights.
   pair=[arc(.14),arc(spry?.09:.13)];break;
  case 6: // Anger: thick inward-leaning lids, no needle-shaped openings.
   pair=[eye(socket?.29:.24,socket?.44:.16,{open:.62,tilt:10,pupil:.7}),eye(socket?.29:.24,socket?.44:.16,{open:.62,tilt:-10,pupil:.7})];break;
  case 7: // Sadness: drooping arcs, asymmetric on the playful character.
   pair=[arc(-.07),spry?eye(.17,.27,{tilt:-8}):arc(-.07)];break;
  case 8: // Fear: round openings with tiny pupils.
   pair=[eye(socket?.32:.28,socket?.65:.36,{pupil:.45}),eye(socket?.30:.25,socket?.62:.33,{pupil:.5})];break;
  case 9: // Suspicion: half-lid and sideways glance.
   left.open=.52;left.pupilX=2.5;right.pupilX=2.5;right.open=.85;break;
  case 10: // Confusion: one eye watches, the other becomes a soft closed stroke.
   pair=[eye(socket?.30:.23,socket?.60:.32,{pupil:1.2,pupilY:-2}),shut()];break;
  case 12: // Pride: a wink with a smiling companion.
   pair=[arc(.09),socket?eye(.28,.5,{open:.65,pupilX:2}):shut()];break;
  case 13: // Shy: soft downward gaze and a shy closed eye.
   left.pupilY=3;left.open=.7;pair=[left,arc(.06)];break;
  case 14: // Bored: a blank lid beside a small sideways pupil.
   pair=[eye(socket?.29:.23,socket?.42:.12,{open:.6,pupilAlpha:0}),eye(socket?.29:.23,socket?.42:.12,{open:.6,pupil:.65,pupilX:-2.5})];break;
  case 15: // Sleepy: both eyes become rounded closed lids.
   pair=[shut(),shut()];break;
 }
 for(const eye of pair)eye.lid=resolveEyeComponent(eye,socket);
 return {...base,character:style,eyes:pair,gaze:{yaw:index===9?10:index===13?-8:0,pitch:index===13?-6:0,roll:spry?(index===10?-10:7):0}};
}
