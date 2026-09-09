import { defineAttachment, defineResourcePack, type AttachmentDefinition } from '@mofli/core';
import bellsData from './bells.json' with { type: 'json' };
import blushData from './blush.json' with { type: 'json' };
import bowData from './bow.json' with { type: 'json' };
import bubblesData from './bubbles.json' with { type: 'json' };
import bunnyData from './bunny.json' with { type: 'json' };
import cheek_starsData from './cheek-stars.json' with { type: 'json' };
import firefliesData from './fireflies.json' with { type: 'json' };
import flowerData from './flower.json' with { type: 'json' };
import frecklesData from './freckles.json' with { type: 'json' };
import gemData from './gem.json' with { type: 'json' };
import haloData from './halo.json' with { type: 'json' };
import hatData from './hat.json' with { type: 'json' };
import hornsData from './horns.json' with { type: 'json' };
import medalData from './medal.json' with { type: 'json' };
import moonData from './moon.json' with { type: 'json' };
import pearlsData from './pearls.json' with { type: 'json' };
import petalsData from './petals.json' with { type: 'json' };
import ribbonsData from './ribbons.json' with { type: 'json' };
import scarfData from './scarf.json' with { type: 'json' };
import sproutData from './sprout.json' with { type: 'json' };

const catalog = {
  bells: bellsData, blush: blushData, bow: bowData, bubbles: bubblesData,
  bunny: bunnyData, cheek_stars: cheek_starsData, fireflies: firefliesData,
  flower: flowerData, freckles: frecklesData, gem: gemData, halo: haloData,
  hat: hatData, horns: hornsData, medal: medalData, moon: moonData,
  pearls: pearlsData, petals: petalsData, ribbons: ribbonsData,
  scarf: scarfData, sprout: sproutData,
};

export const definitions = Object.values(catalog);
const loaded = Object.fromEntries(Object.entries(catalog).map(([key, { name, ...definition }]) => [
  key, { name, attachment: defineAttachment(definition as unknown as AttachmentDefinition) },
])) as { [K in keyof typeof catalog]: { name: string; attachment: ReturnType<typeof defineAttachment> } };

export const parts = Object.values(loaded);
const instances = Object.fromEntries(Object.entries(loaded).map(([key, part]) => [key, part.attachment])) as {
  [K in keyof typeof catalog]: ReturnType<typeof defineAttachment>;
};
export const { bells, blush, bow, bubbles, bunny, cheek_stars, fireflies, flower,
  freckles, gem, halo, hat, horns, medal, moon, pearls, petals, ribbons, scarf, sprout } = instances;

export const accessoryPack = defineResourcePack({ id: 'mofli.accessories', version: 1, attachments: parts });
export default accessoryPack;
