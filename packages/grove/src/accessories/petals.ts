import {defineAttachment,type AttachmentDefinition} from '@mofli/core';
import data from './data/petals.json' with {type:'json'};
export const definition=data as unknown as AttachmentDefinition;
export const attachment=defineAttachment(definition);
