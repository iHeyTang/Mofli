import { resourcesFor } from "../resources.js";
import { extraParts } from "../accessories.js";
import projectDefinition, { projectMode, projectKey } from "../project.js";
import type { StudioProject } from "../project-types.js";
import { PetRegistry, type Rig, type Skin } from "@mofli/core";
import {
  bloubRig,
  bloubStates,
  expressionOptions,
  shapeOptions,
  bloubDuration,
  bloubPosition,
} from "@mofli/grove/rigs/bloub";
import {
  catHeadRig,
  catStates,
  expressionOptions as catExpressions,
} from "@mofli/grove/rigs/cat-head";
import { bloubSkin } from "@mofli/grove/skins/bloub";
import { doughSkin } from "@mofli/grove/skins/mofli-dough";
import { beanSkin } from "@mofli/grove/skins/mofli-bean";
import { stoneSkin } from "@mofli/grove/skins/mofli-stone";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
import { hat } from "@mofli/grove/accessories/hat";
import { bow } from "@mofli/grove/accessories/bow";
export {
  projectMode,
  projectKey,
  shapeOptions,
  expressionOptions,
  catExpressions,
  bloubDuration,
  bloubPosition,
};
export const project = projectDefinition as StudioProject;
const resources = resourcesFor(project);
export const catalog = resources.rigs
  .map((rig) => ({
    rig,
    name:
      rig.id === bloubRig.id
        ? "Bloub"
        : rig.id === catHeadRig.id
          ? "Cat Head"
          : rig.name,
    skins: resources.skins.filter((s) => s.rig === rig.id),
  }))
  .filter((e) => e.skins.length);
export const parts = resources.attachments;
export const registry = new PetRegistry().registerPacks({
  id: "studio",
  version: 1,
  ...resources,
});
const names = [
  "Idle",
  "Thinking",
  "Wink",
  "Surprised",
  "Alert",
  "Notify",
  "Exclaim",
  "Sleep",
  "Egg",
  "Hexagon",
  "Play",
  "Orbit",
  "Burst",
  "Comet",
];
export const statesFor = (rig: Rig) =>
  rig.id === bloubRig.id
    ? bloubStates.map((s, i) => ({ ...s, name: names[i] }))
    : rig.id === catHeadRig.id
      ? catStates
      : [
          {
            index: rig.poseParameters?.state?.default ?? 0,
            id: "default",
            name: "默认",
            duration: 3,
            posterTime: 1,
          },
        ];
export const initialSkin =
  catalog.flatMap((e) => e.skins).find((s) => s.id === project.defaultSkin) ??
  doughSkin;
