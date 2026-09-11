import { orbit } from "./stardust.js";
export { orbit } from "./stardust.js";
import { defineSpatialAttachment, type PetConfig } from "@mofli/core";
import { ellipsoid3D, type Node3D } from "@mofli/core/scene3d";
import { softRevolution } from "./soft-details.js";
const leaf = ellipsoid3D([0.15, 0.27, 0.105], 24, 16);
const brim = softRevolution(0.57, 0.075, 0.85),
  crown = softRevolution(0.35, 0.23, 0.55),
  band = softRevolution(0.025, 0.032, 1, 0.348);
export const hat = defineSpatialAttachment({
  id: "spatial-hat",
  mount: "head.crown",
  colors: { fabric: "#466c56", band: "#f1dfb9" },
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
          material: { color: c.fabric!, gloss: 0.18 },
        },
        {
          id: "hat-crown",
          geometry: crown,
          material: { color: c.fabric!, gloss: 0.18 },
          transform: { position: [0, 0.23, 0] },
        },
        {
          id: "hat-band",
          geometry: band,
          material: { color: c.band!, gloss: 0.15 },
          transform: { position: [0, 0.13, 0] },
        },
      ],
    });

    return children;
  },
});
export const ears = defineSpatialAttachment({
  id: "spatial-ears",
  mount: "head.sides",
  colors: { leaf: "#466c56" },
  parameters: {
    size: { min: 0.6, max: 1.4, default: 1 },
    length: { min: 0.6, max: 1.5, default: 1 },
    hoverHeight: { min: 0.06, max: 0.3, default: 0.1 },
  },
  labels: {
    leaf: "叶片",
    size: "尺寸",
    length: "芽长",
    hoverHeight: "悬浮高度",
  },
  sampleScene({ time }, p, c) {
    const children: Node3D[] = [];

    for (const side of [-1, 1])
      children.push({
        id: `ear-${side < 0 ? "left" : "right"}`,
        geometry: leaf,
        material: { color: c.leaf!, gloss: 0.25 },
        transform: {
          position: [side * 0.11, p.hoverHeight!, -0.035],
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
  if (config.skin.colors) delete config.skin.colors.accessory;
  return config;
}
