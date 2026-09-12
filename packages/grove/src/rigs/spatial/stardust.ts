import { jellyMaterial, defineJellyAttachment } from "./jelly-material.js";
import {
  ellipsoid3D,
  type Geometry3D,
  type Node3D,
  type Vector3,
} from "@mofli/core/scene3d";
import { detailMesh } from "./soft-details.js";

// Shared low-poly volumes are small on screen; no geometry allocations per frame.
const mote = ellipsoid3D([1, 1, 1], 8, 6);
const sphere = ellipsoid3D([1, 1, 1], 32, 12);
const sparkle = detailMesh(
  sphere.vertices.map(([x, y, z]): Vector3 => {
    const a = Math.atan2(y, x),
      r = 0.4 + 0.6 * Math.pow(Math.cos(2 * a), 4);
    return [x * r, y * r, z * 0.3];
  }),
  sphere.triangles,
);
const halo: Geometry3D = {
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
};
const tau = Math.PI * 2;
const fract = (n: number) => n - Math.floor(n);
const seed = (i: number) => fract(Math.sin(i * 127.1 + 31.7) * 43758.5453);
const smooth = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};
function path(angle: number, radius: number, lane: number): Vector3 {
  return [
    Math.sin(angle) * radius,
    0.18 + 0.55 * Math.cos(angle) + 0.18 * Math.sin(angle) + lane,
    Math.cos(angle) * radius * 0.85,
  ];
}
/** Kept under the original resource ID so existing saved accessories upgrade in place. */
export const orbit = defineJellyAttachment({
  id: "spatial-orbit",
  mount: "character.orbit",
  previewNodes: [
    "star-0",
    "glow-0-0",
    "glow-0-1",
    ...Array.from({ length: 5 }, (_, i) => `tail-0-${i}`),
  ],
  colors: { body: "#ffe074", dust: "#bca4ff" },
  parameters: {
    size: { min: 0.6, max: 2, default: 1 },
    radius: { min: 1.1, max: 1.8, default: 1.32 },
    speed: { min: 0, max: 2, default: 0.8 },
    density: { min: 0, max: 1, default: 0.55 },
    trail: { min: 0, max: 1, default: 0.55 },
    glow: { min: 0, max: 1, default: 0.45 },
  },
  labels: {
    body: "星光",
    dust: "微尘",
    size: "粒子大小",
    radius: "环绕范围",
    speed: "飘动速度",
    density: "微尘密度",
    trail: "拖尾长度",
    glow: "柔光强度",
  },
  sampleScene({ time }, p, c) {
    const t = time * p.speed!,
      radius = p.radius!,
      size = p.size!,
      nodes: Node3D[] = [];
    // Three unequal phases avoid a mechanical, evenly spaced planetary ring.
    for (let i = 0; i < 3; i++) {
      const phase = [0.62, 2.94, 4.86][i]!;
      const angle = t * 0.62 + phase + 0.065 * Math.sin(t * 0.7 + phase);
      const lane = 0.07 * Math.sin(t * 0.45 + phase);
      const pulse = 0.82 + 0.18 * Math.sin(t * 1.8 + phase);
      const scale = (i === 0 ? 0.072 : 0.05) * size * pulse;
      const color = i === 1 ? c.dust! : c.body!;
      nodes.push({
        id: `star-${i}`,
        geometry: sparkle,
        material: jellyMaterial(color),
        transform: {
          position: path(angle, radius, lane),
          rotation: [
            0.16 * Math.sin(t + phase),
            0.22 * Math.sin(t * 0.6 + phase),
            t * 0.25 + phase,
          ],
          scale: [scale, scale, scale],
        },
      });
      // A faint crossed halo has volume from side views without screen-facing sprites.
      if (p.glow! > 0)
        for (let axis = 0; axis < 2; axis++)
          nodes.push({
            id: `glow-${i}-${axis}`,
            geometry: halo,
            material: {
              color,
              unlit: true,
              doubleSided: true,
              radialOpacity: 0.18 * p.glow!,
            },
            transform: {
              position: path(angle, radius, lane),
              rotation: axis ? [0, Math.PI / 2, 0] : [0, 0, 0],
              scale: [scale * 2.3, scale * 2.3, scale * 2.3],
            },
          });
      for (let j = 0; j < 5; j++) {
        const tail = (j + 1) / 6,
          a = angle - (0.035 + tail * 0.38) * p.trail!;
        const s = Math.max(
          1e-5,
          0.021 * size * (1 - tail) * smooth(p.trail! * 5) * pulse,
        );
        nodes.push({
          id: `tail-${i}-${j}`,
          geometry: mote,
          material: { color, unlit: true },
          transform: {
            position: path(a, radius, 0.07 * Math.sin(t * 0.45 + phase - tail)),
            scale: [s, s, s],
          },
        });
      }
    }
    // Deterministic particle lifetimes. Birth/death happen at zero size, including when seeking.
    for (let i = 0; i < 28; i++) {
      const a = seed(i + 1),
        b = seed(i + 71),
        age = fract(t * (0.1 + b * 0.07) + a);
      const envelope = Math.pow(Math.sin(Math.PI * age), 2);
      const presence = smooth(p.density! * 28 - i);
      if (presence === 0) continue;
      const s = (0.009 + b * 0.01) * size * envelope * presence;
      const angle =
        t * (0.35 + b * 0.18) + a * tau + 0.1 * Math.sin(t * 0.8 + a * tau);
      const position = path(
        angle,
        radius + 0.06 + seed(i + 23) * 0.17,
        (b - 0.5) * 0.42 + 0.08 * Math.sin(t + a * tau),
      );
      nodes.push({
        id: i === 0 ? "orbit" : `dust-${i}`,
        geometry: mote,
        material: { color: i % 3 === 0 ? c.body! : c.dust!, unlit: true },
        transform: {
          position,
          scale: [Math.max(1e-5, s), Math.max(1e-5, s), Math.max(1e-5, s)],
        },
      });
    }
    return nodes;
  },
});
