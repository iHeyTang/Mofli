import {
  mewRig,
  defineMewSkin,
  type Skin,
  type PetDefinition,
} from "../../rigs/mew/index.js";
const oval = (rx: number, ry: number) =>
  Array.from({ length: 32 }, (_, i) => ({
    x: Math.cos((i * Math.PI) / 16) * rx,
    y: Math.sin((i * Math.PI) / 16) * ry,
  }));
export const patches: Skin = defineMewSkin({
  id: "patches",
  name: "Patches",
  variants: { eyes: "oval" },
  colors: { body: "#242629", face: "#f9f9f9" },
  markings: [
    {
      id: "crown",
      slot: "forehead",
      color: "#b87548",
      opacity: 1,
      points: oval(0.85, 0.95),
    },
    {
      id: "cheek",
      slot: "leftCheek",
      color: "#ddd3c1",
      opacity: 1,
      points: oval(0.95, 0.8),
    },
  ],
});
export const patchesPet: PetDefinition = { rig: mewRig, skin: patches };
