import type {Rig,Skin,Attachment} from '@mofli/core';
import type {StudioProject} from './project-types.js';
export function resourcesFor(project?:StudioProject):{rigs:Rig[];skins:Skin[];attachments:{name:string;attachment:Attachment}[]};
