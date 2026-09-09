import {
  mewRig,
  defineMewSkin,
  type Skin,
  type PetDefinition,
} from "../../rigs/mew/index.js";
export const sesame: Skin = defineMewSkin({
  id: "sesame",
  name: "Ink",
  colors: { body: "#0a0a0c", face: "#f9f9f9" },
  rigConfig: { earLength: 45, cheek: 0 },
});
export const sesamePet: PetDefinition = { rig: mewRig, skin: sesame };
