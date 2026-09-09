import {
  bloubRig,
  defineBloubSkin,
  type Skin,
  type PetDefinition,
} from "@mofli/rig-bloub";
export const bloubSkin: Skin = defineBloubSkin({
  id: "bloub-reference",
  name: "Bloub",
  colors: { body: "#0a0a0c", paper: "#f9f9f9" },
});
export const bloubPet: PetDefinition = { rig: bloubRig, skin: bloubSkin };
