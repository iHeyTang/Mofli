import {
  spatialRig,
  spatialExpressions,
  spatialActions,
  spatialShapes,
} from "@mofli/grove/rigs/spatial";
export { spatialExpressions, spatialActions, spatialShapes };
import { resourcesFor } from "../resources.js";
import { extraParts } from "../accessories.js";
import projectDefinition, { projectMode, projectKey } from "../project.js";
import type { StudioProject } from "../project-types.js";
import { PetRegistry, type Rig, type Skin } from "@mofli/core";
import {
  bloubRig,
  bloubStates,
  expressionOptions as sourceExpressions,
  shapeOptions as sourceShapes,
  bloubDuration,
  bloubPosition,
} from "@mofli/grove/rigs/bloub";
import {
  mewRig,
  catStates,
  expressionOptions as sourceCatExpressions,
} from "@mofli/grove/rigs/mew";
import { bloubSkin } from "@mofli/grove/skins/bloub";
import { doughSkin } from "@mofli/grove/skins/mofli-dough";
import { beanSkin } from "@mofli/grove/skins/mofli-bean";
import { stoneSkin } from "@mofli/grove/skins/mofli-stone";
import { sesame } from "@mofli/grove/skins/cat-ink";
import { patches } from "@mofli/grove/skins/cat-patches";
import { hat } from "@mofli/grove/accessories";
import { bow } from "@mofli/grove/accessories";
const expressionNames = [
  "平静",
  "专注",
  "惊讶",
  "兴奋",
  "开心",
  "大笑",
  "生气",
  "伤心",
  "害怕",
  "怀疑",
  "困惑",
  "好奇",
  "得意",
  "害羞",
  "无聊",
  "困倦",
  "不耐烦",
  "喜欢",
];
const shapeNames = [
  "圆形",
  "鹅卵石",
  "圆角方形",
  "胶囊形",
  "三角形",
  "六边形",
  "云朵",
  "水滴",
  "棉团原形",
  "豆豆原形",
  "卵石原形",
];
const expressionOptions = sourceExpressions.map((s) => ({
  ...s,
  name: expressionNames[s.index] ?? s.name,
}));
const catExpressions = sourceCatExpressions.map((s) => ({
  ...s,
  name: expressionNames[s.index] ?? s.name,
}));
const shapeOptions = sourceShapes.map((s) => ({
  ...s,
  name: shapeNames[s.index] ?? s.name,
}));
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
        : rig.id === mewRig.id
          ? "Mew"
          : rig.name,
    skins: resources.skins.filter((s) => s.rig === rig.id),
  }))
  .filter((e) => e.skins.length);
export const sourceSkinIds = new Set(resources.skins.map((s) => s.id));
export const parts = resources.attachments;
export const registry = new PetRegistry().registerPacks({
  id: "studio",
  version: 1,
  ...resources,
});
const names = [
  "待机",
  "思考",
  "眨眼",
  "惊讶",
  "警觉",
  "消息提醒",
  "感叹",
  "睡眠",
  "蛋形伸展",
  "六边变形",
  "玩耍",
  "环绕",
  "散开重聚",
  "彗星拖尾",
];
export const statesFor = (rig: Rig) =>
  rig.id === spatialRig.id
    ? spatialActions
    : rig.id === bloubRig.id
      ? bloubStates.map((s, i) => ({ ...s, name: names[i] ?? s.name }))
      : rig.id === mewRig.id
        ? catStates.map((s, i) => ({ ...s, name: names[i] ?? s.name }))
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
