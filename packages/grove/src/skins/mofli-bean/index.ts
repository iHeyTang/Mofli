import {design} from "./design.js";
import {
  bloubRig,
  defineBloubSkin,
  type PetDefinition,
} from "../../rigs/bloub/index.js";
export const beanSkin = defineBloubSkin({
  design,
  id: "mofli-bean",
  name: "Pip",
  colors: { body: "#20231f", paper: "#f9f9f6" },
  rigConfig: {
    shape: 9,
    customFace: 1,
    eyeWidth: 0.14,
    eyeHeight: 0.19,
    eyeSpacing: 22,
    faceYaw: -3,
    facePitch: 4,
    faceRoll: 12,
  },
  variants: { temperament: "spry", eyes: "solid" },
});
export const beanPet: PetDefinition = { rig: bloubRig, skin: beanSkin };
