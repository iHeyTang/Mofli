import { spatialParts, migrateSpatialConfig } from "./accessories.js";
export { spatialParts } from "./accessories.js";
import {
  appearance,
  prepareTransition,
  updateTransition,
  transitionAt,
  transitionColor,
  type SpatialTransition,
  type Values,
} from "./transitions.js";
import { detailMesh, expressionEye } from "./soft-details.js";
import { softDeformer } from "./deformation.js";
import { inflateProfile, profileDepth } from "./profiles.js";
import { defineSkin, type Skin } from "@mofli/core";
import {
  defineSpatialRig,
  ellipsoid3D,
  box3D,
  type Node3D,
  type Scene3D,
  type Geometry3D,
  type Vector3,
} from "@mofli/core/scene3d";

import { spatialActions, spatialMotion, spatialBlink } from "./choreography.js";
export {
  spatialExpressions,
  spatialActions,
  spatialShapes,
} from "./choreography.js";

// Kept outside the default pack: existing saved skins and attachment protocols stay unchanged.
const radii: Vector3[] = [
  [0.96, 0.69, 0.73],
  [0.77, 0.89, 0.72],
  [1.04, 0.6, 0.67],
  [1.01, 0.55, 0.86],
  [0.68, 0.98, 0.66],
  [0.79, 0.79, 0.79],
];
function bodyGeometry(shape: number, segments = 64, rings = 20): Geometry3D {
  const mesh = inflateProfile(Math.min(2, shape), segments, rings);
  if (shape < 3) return mesh;
  const [rx, ry, rz] = radii[shape]!;
  const vertices = mesh.vertices.map((_, i): Vector3 => {
    if (i === 0) return [0, 0, rz];
    if (i === mesh.vertices.length - 1) return [0, 0, -rz];
    const p = ((Math.floor((i - 1) / segments) + 1) / rings) * Math.PI,
      a = (((i - 1) % segments) / segments) * Math.PI * 2;
    return [
      rx * Math.cos(a) * Math.sin(p),
      -ry * Math.sin(a) * Math.sin(p),
      rz * Math.cos(p),
    ];
  });
  return detailMesh(vertices, mesh.triangles);
}
const bodies = radii.map((_, i) => bodyGeometry(i));
const compactBodies = radii.map((_, i) => bodyGeometry(i, 48, 16));
const referenceGeometry = box3D([0.16, 1.8, 0.1]);
const orb = ellipsoid3D([0.105, 0.105, 0.105], 20, 12);
const shadow: Geometry3D = {
  vertices: [
    [-1, -1, 0],
    [1, -1, 0],
    [1, 1, 0],
    [-1, 1, 0],
  ],
  triangles: [
    [0, 1, 2],
    [0, 2, 3],
  ],
  faces: [[0, 1, 2, 3]],
};
const fittedCache = new Map<string, Geometry3D>();
export interface SpatialPetOptions {
  detail?: "standard" | "compact";
  transitionValues?: Values;
  time?: number;
  actionTime?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** Index into spatialExpressions, matching the original 2D artwork. */
  expression?: number;
  shape?: number;
  action?: number;
  elasticity?: number;
  reducedMotion?: boolean;
  jelly?: number;
  reference?: boolean;
  hat?: boolean;
  orbit?: boolean;
  ears?: boolean;
  perspective?: boolean;
  light?: number;
  body?: string;
  face?: string;
  accessory?: string;
  extraNodes?: readonly Node3D[];
}
const spatialMounts = [
  "head.crown",
  "head.sides",
  "head.cheeks",
  "head.lower.front",
  "character.orbit",
];
/** Intersection with the actual blended mesh, not its unrelated global apex. */
function surfaceAt(mesh: Geometry3D, axis: 1 | 2, u: number, v: number) {
  const axes = axis === 1 ? [0, 2] : [0, 1];
  let result = -Infinity;
  for (const triangle of mesh.triangles) {
    const [a, b, c] = triangle.map((i) => mesh.vertices[i]!);
    const x = axes[0]!,
      y = axes[1]!;
    const denominator =
      (b![y]! - c![y]!) * (a![x]! - c![x]!) +
      (c![x]! - b![x]!) * (a![y]! - c![y]!);
    if (Math.abs(denominator) < 1e-10) continue;
    const q =
      ((b![y]! - c![y]!) * (u - c![x]!) + (c![x]! - b![x]!) * (v - c![y]!)) /
      denominator;
    const w =
      ((c![y]! - a![y]!) * (u - c![x]!) + (a![x]! - c![x]!) * (v - c![y]!)) /
      denominator;
    if (q >= -1e-7 && w >= -1e-7 && q + w <= 1 + 1e-7)
      result = Math.max(
        result,
        q * a![axis]! + w * b![axis]! + (1 - q - w) * c![axis]!,
      );
  }
  return Number.isFinite(result) ? result : 0;
}
/** A whole 3D scene, including accessories, shares one occlusion pass. */
export function createSpatialPetScene(
  options: SpatialPetOptions = {},
): Scene3D {
  const {
    time = 0,
    yaw = 0,
    pitch = 0,
    roll = 0,
    expression = 0,
    hat = false,
    orbit = false,
    ears = false,
    perspective = false,
  } = options;
  const body =
      options.body ??
      ["#bff2dc", "#ffddc9", "#d8dcff"][
        Math.min(2, Math.max(0, Math.round(options.shape ?? 0)))
      ]!,
    face = options.face ?? (options.shape === 2 ? "#fffdf8" : "#34483f"),
    accessory = options.accessory ?? "#466c56";
  const shape = Math.max(0, Math.min(5, Math.round(options.shape ?? 0)));
  const [rx, ry, rz] = radii[shape]!;
  const values =
    options.transitionValues ??
    appearance({
      parameters: {
        shape,
        expression: Math.max(0, Math.min(18, Math.round(expression))),
      },
      colors: { body, face, accessory },
    });
  const weights = radii.map((_, i) =>
    Math.max(0, values[`shape${i}`] ?? Number(i === shape)),
  );
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  weights.forEach((_, i) => (weights[i]! /= total));
  const models = options.detail === "compact" ? compactBodies : bodies;
  let head = models[shape]!;
  if (weights.some((v, i) => v > 0 && i !== shape)) {
    const vertices = head.vertices.map(
      (_, j): Vector3 =>
        [0, 1, 2].map((k) =>
          models.reduce(
            (sum, g, i) => sum + g.vertices[j]![k]! * weights[i]!,
            0,
          ),
        ) as [number, number, number],
    );
    head = detailMesh(vertices, head.triangles);
  }
  const motion = spatialMotion(
    Math.round(options.action ?? 0),
    options.reducedMotion ? 1 : (options.actionTime ?? time),
    options.reducedMotion ? 0 : (options.elasticity ?? 1),
  );
  if (!options.reducedMotion && options.transitionValues) {
    for (const key of Object.keys(motion) as Array<keyof typeof motion>)
      motion[key] = values[`motion.${key}`] ?? motion[key];
    motion.stretch = Math.max(
      0.35,
      motion.stretch + Math.min(0, motion.y) * 0.5,
    );
    motion.y = Math.max(0, motion.y);
    motion.width = 1 / Math.sqrt(motion.stretch);
  }
  const geometry = { head, orb };
  const deformation =
    Math.abs(motion.flex) > 1e-6
      ? softDeformer(geometry.head, motion.flex)
      : undefined;
  if (deformation) geometry.head = deformation.mesh(geometry.head);
  const blink = options.reducedMotion ? 0 : spatialBlink(time);
  const e = Math.max(0, Math.min(18, Math.round(expression)));
  const zAt = (x: number, y: number) =>
    radii.reduce(
      (sum, r, i) =>
        sum +
        weights[i]! *
          (i < 3
            ? profileDepth(i, x, y)
            : r[2] *
              Math.sqrt(Math.max(0.02, 1 - (x / r[0]) ** 2 - (y / r[1]) ** 2))),
      0,
    ) + 0.022;
  const rotation: Vector3 = [
    pitch + motion.pitch,
    yaw + motion.yaw,
    roll + motion.roll,
  ];
  const [a, b, c] = rotation;
  const row = [
    Math.sin(c) * Math.cos(b),
    Math.sin(c) * Math.sin(b) * Math.sin(a) + Math.cos(c) * Math.cos(a),
    Math.sin(c) * Math.sin(b) * Math.cos(a) - Math.cos(c) * Math.sin(a),
  ];
  const bottom = Math.min(
    ...geometry.head.vertices.map(
      (v) =>
        row[0]! * v[0] * motion.width +
        row[1]! * v[1] * motion.stretch +
        row[2]! * v[2] * motion.width,
    ),
  );
  const ink = { color: face, gloss: 0.12 * (1 - blink) };
  const children: Node3D[] = [
    {
      id: "body",
      geometry: geometry.head,
      material: {
        color: body,
        gloss: 0.5,
        transmission: options.jelly ?? 0.88,
        transmissionRoughness: 0.8,
      },
    },
  ];
  const geometryKey = weights.join(",");
  for (let side = 0; side < 2; side++) {
    const get = (key: string) => values[`eye${side}.${key}`] ?? 0;
    const arc = Math.max(0, Math.min(1, get("arc"))),
      heart = Math.max(0, Math.min(1, get("heart")));
    const width = Math.max(0.008, get("width")),
      height = Math.max(0.007, get("height")),
      depth = Math.max(0.006, get("depth"));
    const x = get("x"),
      y = get("y"),
      tilt = get("tilt");
    const faceKey = [
      geometryKey,
      side,
      width,
      height,
      depth,
      arc,
      heart,
      get("bend"),
      tilt,
      x,
      y,
      blink,
    ].join("/");
    function attach(
      id: string,
      base: () => Geometry3D,
      key: string,
      offset: number,
      color: string,
      gloss: number,
    ) {
      const center = zAt(x, y) + offset;
      let fitted = fittedCache.get(key);
      if (!fitted) {
        const mesh = base();
        const vertices = mesh.vertices.map(([vx, vy, vz]): Vector3 => {
          const px = x + vx * Math.cos(tilt) - vy * Math.sin(tilt),
            py = y + vx * Math.sin(tilt) + vy * Math.cos(tilt);
          return [px - x, py - y, zAt(px, py) + offset + vz - center];
        });
        fitted = detailMesh(vertices, mesh.triangles);
        fittedCache.set(key, fitted);
        if (fittedCache.size > 128)
          fittedCache.delete(fittedCache.keys().next().value!);
      }
      children.push({
        id,
        geometry: fitted,
        material: { color, gloss },
        transform: { position: [x, y, center] },
      });
    }
    attach(
      `eye-${side === 0 ? "left" : "right"}`,
      () => expressionEye(width, height, depth, arc, heart, get("bend"), blink),
      faceKey,
      0.027,
      face,
      0.12 * (1 - blink),
    );
    const visible =
      Math.max(0.001, Math.min(1, get("pupilVisible"))) *
      (1 - arc) *
      Math.max(0.001, 1 - blink);
    const pupilSize = Math.max(0.001, visible * Math.max(0.01, get("pupil")));
    attach(
      `pupil-${side === 0 ? -1 : 1}`,
      () =>
        expressionEye(
          0.06 * pupilSize,
          Math.max(
            0.001,
            Math.min(0.058 * pupilSize, height * (1 - blink) * 0.7),
          ),
          0.022 * pupilSize,
          0,
          Math.max(0, Math.min(1, get("pupilHeart"))),
          0,
          0,
        ),
      faceKey + `/pupil/${pupilSize}/${get("pupilHeart")}`,
      0.066,
      "#34483f",
      0.1,
    );
  }
  const top = surfaceAt(head, 1, 0, 0);
  const width = Math.max(...head.vertices.map((v) => Math.abs(v[0])));
  const depth = Math.max(...head.vertices.map((v) => Math.abs(v[2])));
  const lowerY = Math.min(...head.vertices.map((v) => v[1])) * 0.62;
  const mountTransform = (mount: string): Node3D["transform"] => {
    if (mount === "character.orbit") return { position: [0, 0, 0] };
    if (mount === "head.cheeks")
      return {
        position: [
          0,
          -0.28,
          surfaceAt(head, 2, width * 0.6, -0.28) - depth * 0.82,
        ],
        scale: [width, 1, depth],
      };
    if (mount === "head.lower.front")
      return { position: [0, lowerY, surfaceAt(head, 2, 0, lowerY) + 0.04] };
    if (mount === "head.sides") {
      const left = surfaceAt(head, 1, -width * 0.5, 0);
      const right = surfaceAt(head, 1, width * 0.5, 0);
      const slope = Math.atan2(right - left, width);
      return {
        position: [0, (left + right) * 0.5 + 0.1, 0],
        rotation: [0, 0, slope],
        scale: [Math.hypot(width, right - left), 1, 1],
      };
    }
    return { position: [0, top - 0.01, 0] };
  };
  for (const [key, enabled] of Object.entries({ hat: hat && !ears, ears, orbit })) {
    if (!enabled) continue;
    const a = spatialParts.find(
      (p) => p.attachment.id === `spatial-${key}`,
    )!.attachment;
    const params = Object.fromEntries(
      Object.entries(a.parameters ?? {}).map(([k, r]) => [k, r.default]),
    );
    const colors = {
      ...a.colors,
      ...(key === "hat"
        ? { fabric: accessory }
        : key === "ears"
          ? { leaf: accessory }
          : {}),
    };
    children.push({
      id: `legacy-${key}`,
      transform: { position: [0, key === "orbit" ? 0 : top, 0] },
      children: a.sampleScene!({ time }, params, colors),
    });
  }
  for (const mount of spatialMounts)
    children.push({
      id: `mount-${mount.replaceAll(".", "-")}`,
      transform: mountTransform(mount),
    });
  children.push(...(options.extraNodes ?? []));
  return {
    mounts: Object.fromEntries(
      spatialMounts.map((k) => [k, `mount-${k.replaceAll(".", "-")}`]),
    ),
    camera: {
      projection: perspective ? "perspective" : "orthographic",
      position: [0, 0.12, 6],
      size: 3.45,
      fov: Math.PI / 5.1,
    },
    light: { direction: [-0.6, 0.8, 1], ambient: options.light ?? 0.78 },
    nodes: [
      {
        id: "pet",
        transform: {
          position: [motion.x, -0.78 - bottom + motion.y, 0],
          rotation,
          scale: [motion.width, motion.stretch, motion.width],
        },
        children: deformation ? children.map(deformation.attached) : children,
      },
      ...(options.reference
        ? [-1, 0, 1].map((i) => ({
            id: `reference-${i + 1}`,
            geometry: referenceGeometry,
            material: {
              color: ["#caa589", "#9daea1", "#93a9b9"][i + 1]!,
              unlit: true,
            },
            transform: {
              position: [i * 0.38, 0.05, -0.95] as Vector3,
              rotation: [0, 0, -0.18] as Vector3,
            },
          }))
        : []),
      {
        id: "shadow",
        geometry: shadow,
        material: {
          color: "#68776b",
          unlit: true,
          radialOpacity: 0.18 / (1 + motion.y * 2.5),
        },
        transform: {
          position: [motion.x * 0.6, -0.82, -0.95],
          scale: [0.9 + motion.y * 0.25, 0.115 + motion.y * 0.035, 1],
        },
      },
    ],
  };
}
export const spatialSkin: Skin = {
  version: 1,
  id: "sprout-spatial",
  name: "Mallow 3D",
  rig: "spatial-pet",
  colors: {
    body: "#bff2dc",
    face: "#34483f",
    paper: "#f9f9f6",
  },
};
export const spatialRig = defineSpatialRig({
  migrateConfig: migrateSpatialConfig,
  mounts: Object.fromEntries(
    spatialMounts.map((k) => [
      k,
      { kind: "frame" as const, version: 1 as const },
    ]),
  ),
  id: "spatial-pet",
  version: 1,
  name: "Mofli 3D",
  colors: spatialSkin.colors,
  parameters: {
    perspective: { min: 0, max: 1, default: 0 },
    light: { min: 0.3, max: 1, default: 0.78 },
    shape: { min: 0, max: 5, default: 0 },
    elasticity: { min: 0.3, max: 1.4, default: 1 },
    jelly: { min: 0, max: 1, default: 0.88 },
    reference: { min: 0, max: 1, default: 0 },
  },
  poseParameters: {
    yaw: { min: -Math.PI, max: Math.PI, default: 0 },
    pitch: { min: -1.4, max: 1.4, default: 0 },
    roll: { min: -Math.PI, max: Math.PI, default: 0 },
    expression: { min: 0, max: 18, default: 0 },
    state: { min: 0, max: spatialActions.length - 1, default: 0 },
  },
  prepare: prepareTransition,
  updateSkin: ({ skin, previousSkin, time, prepared }) => ({
    prepared: updateTransition(
      (prepared as SpatialTransition) ?? prepareTransition(previousSkin),
      skin,
      time,
    ),
    transition: "rig",
  }),
  sampleScene({ time, state, skin, reducedMotion, prepared }) {
    const preparedState =
      (prepared as SpatialTransition) ?? prepareTransition(skin);
    const p = reducedMotion
        ? appearance(skin)
        : transitionAt(preparedState, time),
      t = reducedMotion ? 1 : time,
      attention = reducedMotion ? 0 : state.attention;
    const yaw =
      p.yaw! +
      (Math.sin(t * 0.65) * 0.13 + p.focus!) * (1 - attention) +
      state.look.x * 0.65 * attention;
    const pitch =
      p.pitch! +
      Math.sin(t * 0.8) * 0.055 * (1 - attention) +
      state.look.y * 0.35 * attention;
    return createSpatialPetScene({
      time: t,
      transitionValues: reducedMotion ? undefined : p,
      actionTime: Math.max(0, t - preparedState.actionAt),
      yaw,
      pitch,
      roll: p.roll!,
      expression: skin.parameters.expression!,
      shape: skin.parameters.shape!,
      action: skin.parameters.state!,
      elasticity: p.elasticity!,
      reducedMotion,
      jelly: p.jelly!,
      reference: p.reference! >= 0.5,
      perspective: p.perspective! >= 0.5,
      light: p.light!,
      body: transitionColor(p, "body"),
      face: transitionColor(p, "face"),
      accessory: "#466c56",
    });
  },
});

export const defineSpatialSkin = (input: Parameters<typeof defineSkin>[1]) =>
  defineSkin(spatialRig, input);

export const spatialSkins: Skin[] = [
  spatialSkin,
  defineSpatialSkin({
    id: "pip-spatial",
    name: "Pip 3D",
    colors: { body: "#ffddc9", face: "#61493d" },
    rigConfig: { shape: 1 },
  }),
  defineSpatialSkin({
    id: "pebble-spatial",
    name: "Pebble 3D",
    colors: { body: "#d8dcff", face: "#fffdf8" },
    rigConfig: { shape: 2 },
  }),
];
