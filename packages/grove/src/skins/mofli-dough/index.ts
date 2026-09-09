import {design} from "./design.js";
import {
  bloubRig,
  defineBloubSkin,
  type PetDefinition,
} from "../../rigs/bloub/index.js";
export const doughSkin = defineBloubSkin({
  design,
  id: "mofli-dough",
  name: "Mallow",
  colors: { body: "#20231f", paper: "#f9f9f6" },
  rigConfig: {
    shape: 8,
    customFace: 1,
    eyeWidth: 0.14,
    eyeHeight: 0.19,
    eyeSpacing: 26,
    faceYaw: 0,
    facePitch: -3,
    faceRoll: 0,
  },
  variants: { temperament: "mellow", eyes: "solid" },
});
export const doughPet: PetDefinition = { rig: bloubRig, skin: doughSkin };
