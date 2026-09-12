import { jellyMaterial, defineJellyAttachment } from "./jelly-material.js";
import { ellipsoid3D, type Node3D, type Vector3 } from "@mofli/core/scene3d";
import { detailMesh, roundedStroke } from "./soft-details.js";

// Softly bevel a closed silhouette into a padded, two-sided volume.
function cushion(outline: [number, number][], depth: number) {
  const points: [number, number][] = [];
  for (let i = 0; i < outline.length; i++) {
    const prev = outline[(i + outline.length - 1) % outline.length]!,
      p = outline[i]!,
      next = outline[(i + 1) % outline.length]!;
    const a = p.map((v, k) => v * 0.65 + prev[k]! * 0.35),
      b = p.map((v, k) => v * 0.65 + next[k]! * 0.35);
    for (let j = 0; j < 4; j++) {
      const t = j / 4;
      points.push(
        [0, 1].map(
          (k) => (1 - t) ** 2 * a[k]! + 2 * t * (1 - t) * p[k]! + t * t * b[k]!,
        ) as [number, number],
      );
    }
  }
  const center = [0, 1].map(
    (k) => points.reduce((n, p) => n + p[k]!, 0) / points.length,
  );
  const vertices: Vector3[] = [],
    triangles: [number, number, number][] = [];
  const n = points.length;
  for (let ring = 0; ring <= 6; ring++) {
    const angle = (ring / 6) * Math.PI,
      radius = Math.max(0.001, Math.sin(angle));
    for (const p of points)
      vertices.push([
        center[0]! + (p[0] - center[0]!) * radius,
        center[1]! + (p[1] - center[1]!) * radius,
        Math.cos(angle) * depth,
      ]);
  }
  for (let r = 0; r < 6; r++)
    for (let j = 0; j < n; j++) {
      const a = r * n + j,
        b = r * n + ((j + 1) % n);
      triangles.push([a, b, a + n], [b, b + n, a + n]);
    }
  const area = outline.reduce((sum, p, i) => {
    const q = outline[(i + 1) % outline.length]!;
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0);
  return detailMesh(
    vertices,
    area > 0 ? triangles.map(([a, b, c]) => [a, c, b]) : triangles,
  );
}
// A closed, inflated egg volume has rounded curvature from every viewing angle.
const earHull = ellipsoid3D([1, 1, 1], 20, 14);
const catOuter = detailMesh(
  earHull.vertices.map(([x, y, z]): Vector3 => [
    x * 0.27 * (1 - 0.36 * y),
    (y + 1) * 0.225,
    z * 0.2,
  ]),
  earHull.triangles,
);
// The inset follows the front surface; it is not a second protruding ear.
const insetVertices: [number, number, number][] = [[0, 0.245, 0]];
const insetTriangles: [number, number, number][] = [];
for (let ring = 1; ring <= 6; ring++)
  for (let segment = 0; segment < 20; segment++) {
    const angle = (segment / 20) * Math.PI * 2;
    insetVertices.push([
      (Math.cos(angle) * 0.115 * ring) / 6,
      0.245 + (Math.sin(angle) * 0.125 * ring) / 6,
      0,
    ]);
  }
for (let i = 0; i < 20; i++) {
  insetTriangles.push([0, 1 + i, 1 + ((i + 1) % 20)]);
  for (let ring = 0; ring < 5; ring++) {
    const a = 1 + ring * 20 + i,
      b = 1 + ring * 20 + ((i + 1) % 20);
    insetTriangles.push([a, a + 20, b], [b, a + 20, b + 20]);
  }
}
const catInner = detailMesh(
  insetVertices.map(([x, y]): Vector3 => {
    const normalized = (y - 0.245) / 0.125;
    const py = 0.235 + normalized * 0.13;
    const px = (x / 0.115) * 0.135 * (1 - 0.3 * normalized);
    const v = py / 0.225 - 1,
      u = px / (0.27 * (1 - 0.36 * v));
    return [px, py, 0.2 * Math.sqrt(Math.max(0, 1 - u * u - v * v)) + 0.004];
  }),
  insetTriangles,
);
// Narrow roots, full upper lobes and a softly folded tip; the two ears have
// different bends while sharing the same surface for fur and inner coloring.
function rabbitEar(side: number) {
  const warp = ([x, y, z]: Vector3, inset = false): Vector3 => {
    const t = (y + 1) * 0.5;
    const bend = side < 0 ? 0.28 : 1;
    const curl = t ** 5 * bend;
    const center: Vector3 = [
      side * (0.025 * t + 0.14 * curl),
      -0.07 + 0.86 * t - 0.23 * curl,
      0.27 * curl,
    ];
    const derivative = [
      side * (0.025 + 0.7 * bend * t ** 4),
      0.86 - 1.15 * bend * t ** 4,
      1.35 * bend * t ** 4,
    ];
    const length = Math.hypot(...derivative);
    const tangent = derivative.map((v) => v / length);
    const u = [
      1 - tangent[0]! ** 2,
      -tangent[0]! * tangent[1]!,
      -tangent[0]! * tangent[2]!,
    ];
    const ul = Math.hypot(...u);
    for (let i = 0; i < 3; i++) u[i]! /= ul;
    const v = [
      u[1]! * tangent[2]! - u[2]! * tangent[1]!,
      u[2]! * tangent[0]! - u[0]! * tangent[2]!,
      u[0]! * tangent[1]! - u[1]! * tangent[0]!,
    ];
    const across = Math.sign(x) * Math.abs(x) ** 0.65 * (0.145 + 0.035 * t * t);
    const front = z * (0.12 + 0.025 * t * t) + (inset ? 0.004 : 0);
    return center.map((c, i) => c + u[i]! * across + v[i]! * front) as [
      number,
      number,
      number,
    ];
  };
  const hull = ellipsoid3D([1, 1, 1], 16, 12);
  const patch = insetVertices.map(([x, y]): Vector3 => {
    const u = (x / 0.115) * 0.58;
    const v = ((y - 0.245) / 0.125) * 0.7 + 0.04;
    return warp([u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))], true);
  });
  return {
    outer: detailMesh(
      hull.vertices.map((v) => warp(v)),
      hull.triangles,
    ),
    inner: detailMesh(patch, insetTriangles),
  };
}
const rabbitLeft = rabbitEar(-1),
  rabbitRight = rabbitEar(1);
function animalEars(rabbit: boolean) {
  return defineJellyAttachment({
    id: rabbit ? "spatial-rabbit-ears" : "spatial-cat-ears",
    mount: "head.sides",
    colors: { fur: rabbit ? "#f7f3ff" : "#b6a5ef", inner: "#ffb0cf" },
    parameters: {
      size: { min: 0.7, max: 1.2, default: 1 },
      hoverHeight: { min: 0.04, max: 0.35, default: 0.14 },
      spread: { min: 0.36, max: 0.62, default: rabbit ? 0.39 : 0.5 },
      tilt: { min: 0, max: 0.4, default: rabbit ? 0.12 : 0.19 },
    },
    labels: {
      fur: "外耳",
      inner: "内耳",
      size: "耳朵大小",
      hoverHeight: "悬浮高度",
      spread: "耳间距",
      tilt: "外张角度",
    },
    sampleScene({ time }, p, c) {
      return [-1, 1].map(
        (side) =>
          ({
            id: side < 0 ? "ear-left" : "ear-right",
            transform: {
              position: [
                side * p.spread!,
                p.hoverHeight! -
                  0.08 +
                  (rabbit ? 0.07 * p.size! : 0) +
                  Math.sin(time * 1.7 + side * 0.35) * 0.018,
                0,
              ],
              rotation: [
                0,
                side * -0.08,
                -side * (p.tilt! + Math.sin(time * 2.1) * 0.025),
              ],
              scale: [p.size!, p.size!, p.size!],
            },
            children: [
              {
                id: `fur-${side}`,
                geometry: rabbit
                  ? (side < 0 ? rabbitLeft : rabbitRight).outer
                  : catOuter,
                material: jellyMaterial(c.fur!),
                transform: { position: [0, 0, 0] },
              },
              {
                id: `inner-${side}`,
                geometry: rabbit
                  ? (side < 0 ? rabbitLeft : rabbitRight).inner
                  : catInner,
                material: jellyMaterial(c.inner!, 0.5),
                transform: {
                  position: [0, 0, 0],
                },
              },
            ],
          }) as Node3D,
      );
    },
  });
}
export const catEars = animalEars(false);
export const rabbitEars = animalEars(true);
const whiskerCurves = [-1, 1].flatMap((side) =>
  [-1, 0, 1].map((row) => ({
    id: `whisker-${side}-${row}`,
    mesh: roundedStroke(
      Array.from({ length: 5 }, (_, i): Vector3 => {
        const t = i / 4;
        return [
          side * (0.52 + 0.24 * t),
          row * (0.065 + 0.03 * t),
          0.86 - 0.06 * t * t,
        ];
      }),
      0.012,
    ),
  })),
);
export const whiskers = defineJellyAttachment({
  id: "spatial-cat-whiskers",
  mount: "head.cheeks",
  colors: { whisker: "#667ba1" },
  parameters: {
    size: { min: 0.75, max: 1.2, default: 1 },
    hoverDistance: { min: 0.08, max: 0.3, default: 0.16 },
  },
  labels: { whisker: "胡须颜色", size: "胡须长度", hoverDistance: "悬浮距离" },
  sampleScene(_, p, c) {
    return [
      {
        id: "short-whiskers",
        transform: {
          position: [0, 0, p.hoverDistance!],
          scale: [p.size!, 1, 1],
        },
        children: whiskerCurves.map((w) => ({
          id: w.id,
          geometry: w.mesh,
          material: jellyMaterial(c.whisker!, 0.5),
        })),
      },
    ];
  },
});
const petal = cushion(
  [
    [-0.07, 0],
    [0, -0.045],
    [0.07, 0],
    [0.125, 0.15],
    [0.075, 0.255],
    [0, 0.23],
    [-0.075, 0.255],
    [-0.125, 0.15],
  ],
  0.065,
);
export const flower = defineJellyAttachment({
  id: "spatial-flower",
  mount: "head.crown",
  colors: { petal: "#ffd2ec", center: "#fff0ac" },
  parameters: { size: { min: 0.65, max: 1.25, default: 1 } },
  labels: { petal: "花瓣", center: "花心", size: "花朵大小" },
  sampleScene({ time }, p, c) {
    return [
      {
        id: "flower",
        transform: {
          position: [0, 0.28, 0.035],
          rotation: [-0.16, 0, Math.sin(time * 1.5) * 0.045],
          scale: [p.size!, p.size!, p.size!],
        },
        children: [
          ...Array.from({ length: 5 }, (_, i): Node3D => {
            const a = (i * Math.PI * 2) / 5;
            return {
              id: `petal-${i}`,
              geometry: petal,
              material: jellyMaterial(c.petal!),
              transform: {
                position: [Math.sin(a) * 0.025, Math.cos(a) * 0.025, 0],
                rotation: [0, 0, -a],
              },
            };
          }),
          {
            id: "center",
            geometry: ellipsoid3D([0.095, 0.095, 0.08], 16, 12),
            material: jellyMaterial(c.center!),
            transform: { position: [0, 0, 0.07] },
          },
        ],
      },
    ];
  },
});
const bowWing = cushion(
  [
    [0.035, -0.03],
    [0.25, -0.145],
    [0.36, -0.1],
    [0.38, 0.095],
    [0.29, 0.18],
    [0.14, 0.13],
    [0.035, 0.035],
  ],
  0.065,
);
const bowTail = cushion(
  [
    [0.035, -0.035],
    [0.13, -0.03],
    [0.235, -0.245],
    [0.15, -0.215],
    [0.095, -0.28],
    [0.065, -0.16],
  ],
  0.025,
);
const bowKnot = cushion(
  [
    [-0.06, -0.08],
    [0.06, -0.08],
    [0.065, 0.08],
    [-0.065, 0.08],
  ],
  0.075,
);
export const bowTie = defineJellyAttachment({
  id: "spatial-bow-tie",
  mount: "head.lower.front",
  colors: { ribbon: "#ff9cc8", knot: "#f575ac" },
  parameters: { size: { min: 0.65, max: 1.3, default: 1 } },
  labels: { ribbon: "缎带", knot: "结心", size: "蝴蝶结大小" },
  sampleScene(_, p, c) {
    return [
      {
        id: "bow",
        transform: { scale: [p.size!, p.size!, p.size!] },
        children: [
          ...[-1, 1].flatMap((side): Node3D[] => [
            {
              id: `wing-${side}`,
              geometry: bowWing,
              material: jellyMaterial(c.ribbon!),
              transform: { rotation: [0, side < 0 ? Math.PI : 0, 0] },
            },
            {
              id: `tail-${side}`,
              geometry: bowTail,
              material: jellyMaterial(c.ribbon!),
              transform: {
                rotation: [0, side < 0 ? Math.PI : 0, 0],
                position: [0, 0, -0.015],
              },
            },
          ]),
          {
            id: "knot",
            geometry: bowKnot,
            material: jellyMaterial(c.knot!),
            transform: { position: [0, 0, 0.04] },
          },
        ],
      },
    ];
  },
});
export const blush = defineJellyAttachment({
  id: "spatial-blush",
  mount: "head.cheeks",
  colors: { blush: "#ff9ec5" },
  parameters: { size: { min: 0.6, max: 1.25, default: 1 } },
  labels: { blush: "腮红", size: "腮红大小" },
  sampleScene(_, p, c) {
    return [-1, 1].map((side): Node3D => ({
      id: `blush-${side}`,
      geometry: ellipsoid3D([0.12, 0.065, 0.028], 20, 12),
      material: jellyMaterial(c.blush!, 0.5),
      transform: {
        position: [side * 0.58, -0.045, 0.89],
        rotation: [0, side * 0.45, 0],
        scale: [p.size!, p.size!, 1],
      },
    }));
  },
});
// One continuous scalloped band, rounded across its thickness and crest.
const crownVertices: Vector3[] = [],
  crownTriangles: [number, number, number][] = [];
for (let i = 0; i < 60; i++) {
  const a = (i / 60) * Math.PI * 2,
    height = 0.12 + 0.16 * (0.5 + 0.5 * Math.cos(5 * a)) ** 2;
  for (let j = 0; j < 10; j++) {
    const b = (j / 10) * Math.PI * 2,
      radius = 0.285 + 0.028 * Math.sin(b);
    crownVertices.push([
      Math.sin(a) * radius,
      0.03 + height * (0.5 + 0.5 * Math.cos(b)),
      Math.cos(a) * radius,
    ]);
  }
}
for (let i = 0; i < 60; i++)
  for (let j = 0; j < 10; j++) {
    const a = i * 10 + j,
      b = ((i + 1) % 60) * 10 + j,
      c = i * 10 + ((j + 1) % 10),
      d = ((i + 1) % 60) * 10 + ((j + 1) % 10);
    crownTriangles.push([a, b, c], [b, d, c]);
  }
const crownBand = detailMesh(
  crownVertices,
  crownTriangles.map(([a, b, c]) => [a, c, b]),
);
const crownPearl = ellipsoid3D([0.045, 0.045, 0.045], 12, 8);
const crownGem = cushion(
  [
    [0, -0.075],
    [0.065, 0],
    [0, 0.075],
    [-0.065, 0],
  ],
  0.035,
);
export const crown = defineJellyAttachment({
  id: "spatial-crown",
  mount: "head.crown",
  colors: { gold: "#ffe9a1", gem: "#b5f4ee" },
  parameters: { size: { min: 0.7, max: 1.3, default: 1 } },
  labels: { gold: "皇冠", gem: "宝石", size: "皇冠大小" },
  sampleScene(_, p, c) {
    return [
      {
        id: "crown",
        transform: {
          position: [0, 0.03, 0],
          scale: [p.size!, p.size!, p.size!],
        },
        children: [
          {
            id: "ring",
            geometry: crownBand,
            material: jellyMaterial(c.gold!),
          },
          ...Array.from({ length: 5 }, (_, i): Node3D => {
            const a = (i / 5) * Math.PI * 2;
            return {
              id: `point-${i}`,
              geometry: crownPearl,
              material: jellyMaterial(c.gold!),
              transform: {
                position: [Math.sin(a) * 0.285, 0.31, Math.cos(a) * 0.285],
                rotation: [0, a, 0],
              },
            };
          }),
          {
            id: "gem",
            geometry: crownGem,
            material: jellyMaterial(c.gem!),
            transform: { position: [0, 0.13, 0.325] },
          },
        ],
      },
    ];
  },
});
