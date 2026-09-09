import type {BotExpression} from './vendor/expressions.js';
import type {EyeCfg} from './vendor/states.js';
import {resolveEyeComponent} from './eye-component.js';

// Quiet, rounded socket vocabulary. Dimensions stay in the rig's tangent plane;
// skins select this profile without owning geometry or transition code.
export function steadyExpression(base:BotExpression,index:number):BotExpression {
 const socket=(w=.27,h=.57,extra:Partial<EyeCfg>={}):EyeCfg=>({w,h,open:1,tilt:0,pupil:1.35,...extra});
 const smile=(w=.43,bend=.085):EyeCfg=>socket(w,.07,{bend,pupilAlpha:0});
 const lid=(w=.25,h=.12):EyeCfg=>socket(w,h,{pupilAlpha:0});
 let eyes:[EyeCfg,EyeCfg]=[socket(),socket()];
 let yaw=0,pitch=0,roll=0;
 switch(index){
  case 0: eyes=[socket(.27,.54,{pupilX:1}),socket(.27,.54,{pupilX:1})];yaw=4;break;
  case 1: eyes=[socket(.265,.48,{pupil:1.65}),socket(.265,.48,{pupil:1.65})];pitch=2;break;
  case 2: eyes=[socket(.30,.72,{pupil:1.05}),socket(.30,.72,{pupil:1.05})];pitch=-2;break;
  case 3: eyes=[socket(.29,.60,{pupil:1.75,pupilY:-1}),smile(.44,.10)];roll=-3;break;
  case 4: eyes=[smile(),smile()];pitch=3;break;
  case 5: eyes=[smile(.50,.13),smile(.50,.13)];pitch=5;break;
  case 6: eyes=[socket(.28,.30,{tilt:9,pupil:1.2}),socket(.28,.30,{tilt:-9,pupil:1.2})];pitch=3;break;
  case 7: eyes=[socket(.255,.41,{tilt:-7,pupilY:3,pupil:1.3}),socket(.255,.41,{tilt:7,pupilY:3,pupil:1.3})];pitch=-4;break;
  case 8: eyes=[socket(.25,.76,{pupil:.65,pupilY:2}),socket(.25,.76,{pupil:.65,pupilY:2})];roll=-3;break;
  case 9: eyes=[socket(.28,.25,{pupilX:2.5,pupil:1.25}),socket(.26,.52,{pupilX:2.5,pupil:1.25})];yaw=3;break;
  case 10: eyes=[socket(.27,.64,{pupil:1.1,pupilY:-2}),socket(.25,.33,{pupil:1.4,pupilY:-2})];roll=-7;break;
  case 11: eyes=[socket(.29,.65,{pupil:1.6,pupilX:1.5}),socket(.27,.57,{pupil:1.5,pupilX:1.5})];yaw=5;roll=4;break;
  case 12: eyes=[smile(.42,.065),socket(.27,.32,{pupil:1.3,pupilX:-1.5})];pitch=5;roll=3;break;
  case 13: eyes=[socket(.245,.43,{pupil:1.55,pupilY:3}),smile(.37,.065)];yaw=-3;pitch=-5;roll=-3;break;
  case 14: eyes=[socket(.27,.23,{pupil:1.2,pupilX:-2.5}),socket(.27,.23,{pupil:1.2,pupilX:-2.5})];yaw=-3;break;
  case 15: eyes=[lid(.26,.065),lid(.26,.065)];pitch=-3;break;
  case 16: eyes=[lid(.27,.24),lid(.27,.24)];pitch=6;break;
  case 17: eyes=[socket(.30,.63,{pupil:1.75,heart:1}),socket(.30,.63,{pupil:1.75,heart:1})];pitch=2;break;
 }
 for(const eye of eyes)eye.lid=resolveEyeComponent(eye,true);
 return {...base,eyes,character:'steady',gaze:{yaw,pitch,roll}};
}
