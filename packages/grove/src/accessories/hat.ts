import {defineAttachment,type AttachmentDefinition} from '@mofli/core';
import data from './data/hat.json' with {type:'json'};
export const definition=data as unknown as AttachmentDefinition;
export const hat=defineAttachment(definition);
