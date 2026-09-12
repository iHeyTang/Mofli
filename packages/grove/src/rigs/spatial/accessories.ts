import { jellyMaterial, defineJellyAttachment } from "./jelly-material.js";
import {
  catEars,
  rabbitEars,
  whiskers,
  flower,
  crown as royalCrown,
  bowTie,
  blush,
} from "./animal-accessories.js";
export {
  catEars,
  rabbitEars,
  whiskers,
  flower,
  royalCrown as crown,
  bowTie,
  blush,
};
import { orbit } from "./stardust.js";
export { orbit } from "./stardust.js";
import { type PetConfig } from "@mofli/core";
import { ellipsoid3D, type Node3D } from "@mofli/core/scene3d";
import { softRevolution, roundedStroke } from "./soft-details.js";
const leaf = ellipsoid3D([0.15, 0.27, 0.105], 16, 12);
const brim = softRevolution(0.57, 0.075, 0.85),
  crown = softRevolution(0.35, 0.23, 0.55),
  band = softRevolution(0.025, 0.032, 1, 0.348);
export const hat = defineJellyAttachment({
  id: "spatial-hat",
  mount: "head.crown",
  colors: { fabric: "#b6a5ef", band: "#fff0a8" },
  parameters: {
    size: { min: 0.6, max: 1.4, default: 1 },
    hoverHeight: { min: 0.1, max: 0.4, default: 0.16 },
    tilt: { min: -0.5, max: 0.5, default: -0.12 },
  },
  labels: {
    fabric: "帽身",
    band: "帽带",
    size: "尺寸",
    hoverHeight: "悬浮高度",
    tilt: "倾斜",
  },
  sampleScene({ time }, p, c) {
    const children: Node3D[] = [];

    children.push({
      id: "hat",
      transform: {
        position: [-0.05, p.hoverHeight!, -0.04],
        rotation: [0, 0, p.tilt!],
        scale: [p.size!, p.size!, p.size!],
      },
      children: [
        {
          id: "hat-brim",
          geometry: brim,
          material: jellyMaterial(c.fabric!),
        },
        {
          id: "hat-crown",
          geometry: crown,
          material: jellyMaterial(c.fabric!),
          transform: { position: [0, 0.23, 0] },
        },
        {
          id: "hat-band",
          geometry: band,
          material: jellyMaterial(c.band!),
          transform: { position: [0, 0.13, 0] },
        },
      ],
    });

    return children;
  },
});
export const ears = defineJellyAttachment({
  id: "spatial-ears",
  mount: "head.crown",
  colors: { leaf: "#65daa1" },
  parameters: {
    size: { min: 0.6, max: 1.4, default: 1 },
    length: { min: 0.6, max: 1.5, default: 1 },
    hoverHeight: { min: 0, max: 0.3, default: 0.03 },
  },
  labels: {
    leaf: "叶片",
    size: "尺寸",
    length: "芽长",
    hoverHeight: "茎长",
  },
  sampleScene({ time }, p, c) {
    const stemHeight = (0.16 + p.hoverHeight!) * p.size! * p.length!;
    const children: Node3D[] = [
      {
        id: "stem",
        geometry: roundedStroke(
          [
            [0, -0.025, 0],
            [0, stemHeight * 0.5, 0],
            [0, stemHeight, 0],
          ],
          0.022 * p.size!,
        ),
        material: jellyMaterial(c.leaf!),
      },
    ];

    for (const side of [-1, 1])
      children.push({
        id: `ear-${side < 0 ? "left" : "right"}`,
        geometry: leaf,
        material: jellyMaterial(c.leaf!),
        transform: {
          position: [
            side * 0.12 * p.size!,
            stemHeight + 0.11 * p.size! * p.length!,
            0,
          ],
          rotation: [0.1, side * 0.25, side * -0.65],
          scale: [
            p.size!,
            p.size! * p.length! * (side === 1 ? 0.8 : 1),
            p.size!,
          ],
        },
      });

    return children;
  },
});
export const spatialParts = [
  { name: "礼帽", attachment: hat },
  { name: "小芽", attachment: ears },
  { name: "星尘环绕", attachment: orbit },
  { name: "猫耳", attachment: catEars },
  { name: "兔耳", attachment: rabbitEars },
  { name: "短猫胡须", attachment: whiskers },
  { name: "小花", attachment: flower },
  { name: "小皇冠", attachment: royalCrown },
  { name: "蝴蝶结", attachment: bowTie },
  { name: "腮红", attachment: blush },
];
/** Upgrade the early 3D prototype's body-owned accessory switches and shared color. */
export function migrateSpatialConfig(config: PetConfig): PetConfig {
  if (!config.skin || !config.rigConfig || !Array.isArray(config.attachments))
    return config;
  const shared = config.skin.colors?.accessory;
  for (const key of ["hat", "ears", "orbit"]) {
    if (
      (config.rigConfig[key] ?? config.skin.rigConfig?.[key] ?? 0) >= 0.5 &&
      !config.attachments.some((a) => a.type === `spatial-${key}`)
    )
      config.attachments.push({
        id: `spatial-${key}`,
        type: `spatial-${key}`,
        version: 1,
        ...(shared && key !== "orbit"
          ? { colors: { [key === "hat" ? "fabric" : "leaf"]: shared } }
          : {}),
      });
    delete config.rigConfig[key];
    if (config.skin.rigConfig) delete config.skin.rigConfig[key];
  }
  // Earlier releases separated plants from hats at the same physical position.
  // Keep the last worn group's item, preserving duplicate validation within it.
  const plants = new Set(["spatial-ears", "spatial-flower"]);
  const hats = new Set(["spatial-hat", "spatial-crown"]);
  const crownItems = config.attachments.filter(
    (a) => plants.has(a.type) || hats.has(a.type),
  );
  if (
    crownItems.some((a) => plants.has(a.type)) &&
    crownItems.some((a) => hats.has(a.type))
  ) {
    const discarded = plants.has(crownItems.at(-1)!.type) ? hats : plants;
    config.attachments = config.attachments.filter(
      (a) => !discarded.has(a.type),
    );
  }
  if (config.skin.colors) delete config.skin.colors.accessory;
  return config;
}
