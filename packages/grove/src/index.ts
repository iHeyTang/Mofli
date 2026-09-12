import {defineResourcePack} from '@mofli/core';
import {bloubRig} from './rigs/bloub/index.js';
import {mewRig} from './rigs/mew/index.js';
import {bloubSkin} from './skins/bloub/index.js';
import {doughSkin} from './skins/mofli-dough/index.js';
import {beanSkin} from './skins/mofli-bean/index.js';
import {stoneSkin} from './skins/mofli-stone/index.js';
import {sesame} from './skins/cat-ink/index.js';
import {patches} from './skins/cat-patches/index.js';
import {parts} from './accessories/index.js';
export {bloubRig,defineBloubSkin} from './rigs/bloub/index.js';
export {mewRig,defineMewSkin} from './rigs/mew/index.js';
export {bloubSkin,doughSkin,beanSkin,stoneSkin,sesame,patches,parts};
export const grovePack=defineResourcePack({id:'mofli.grove',version:1,rigs:[bloubRig,mewRig],skins:[doughSkin,beanSkin,stoneSkin,bloubSkin,sesame,patches],attachments:parts});
export default grovePack;

export { mewRig as catHeadRig, defineMewSkin as defineCatSkin } from "./rigs/mew/index.js";

export { companionActions, companionMotion, type CompanionActionId } from "./rigs/companion-actions.js";
