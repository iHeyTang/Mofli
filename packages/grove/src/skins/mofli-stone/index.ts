import {design} from "./design.js";
import {
  bloubRig,
  defineBloubSkin,
  type PetDefinition,
} from "../../rigs/bloub/index.js";
export const stoneSkin = defineBloubSkin({
  design,
  id: "mofli-stone",
  name: "Pebble",
  colors: { body: "#20231f", paper: "#f9f9f6" },
  rigConfig: {
    shape: 10,
    customFace: 1,
    eyeWidth: 0.29,
    eyeHeight: 0.6,
    eyeSpacing: 24,
    faceYaw: 0,
    facePitch: 3,
    faceRoll: 0,
  },
  variants: { temperament: "steady", eyes: "socket" },
});
export const stonePet: PetDefinition = { rig: bloubRig, skin: stoneSkin };
