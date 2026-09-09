import {
  catHeadRig,
  defineCatSkin,
  type Skin,
  type PetDefinition,
} from "../../rigs/cat-head/index.js";
export const sesame: Skin = defineCatSkin({
  id: "sesame",
  name: "Ink",
  colors: { body: "#0a0a0c", face: "#f9f9f9" },
  rigConfig: { earLength: 45, cheek: 0 },
});
export const sesamePet: PetDefinition = { rig: catHeadRig, skin: sesame };
