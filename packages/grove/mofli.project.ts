import { grovePack } from './src/index.js';
import type { StudioProject } from '@mofli/studio';

export default {
  packs: [grovePack],
  defaultSkin: 'mofli-dough',
} satisfies StudioProject;
