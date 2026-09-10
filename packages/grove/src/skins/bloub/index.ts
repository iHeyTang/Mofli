import {
  bloubRig,
  defineBloubSkin,
  type Skin,
  type PetDefinition,
} from "../../rigs/bloub/index.js";
export const bloubSkin: Skin = defineBloubSkin({
  id: "bloub-reference",
  name: "Bloub",
  colors: { body: "#20231f", paper: "#f9f9f6" },
});
export const bloubPet: PetDefinition = { rig: bloubRig, skin: bloubSkin };
