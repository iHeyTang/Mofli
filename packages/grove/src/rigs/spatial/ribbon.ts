import { jellyMaterial, defineJellyAttachment } from "./jelly-material.js";
import {
  ellipsoid3D,
  type Geometry3D,
  type Node3D,
  type Vector3,
} from "@mofli/core/scene3d";
import { taperedStroke } from "./soft-details.js";

const mote = ellipsoid3D([1, 1, 1], 8, 6);
/** Screen-facing soft disc; two crossed copies give volume from every view. */
const glow: Geometry3D = {
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
const smooth = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};
const fract = (n: number) => n - Math.floor(n);
const seed = (i: number) => fract(Math.sin(i * 127.1 + 31.7) * 43758.5453);

/** The band is wider than it is deep, so it reads as a ring from the front. */
const FLATTEN = 0.84;
/** Swept stretches; each one carries its own width and its own depth fade. */
const SEGMENTS = 11;
/** Path samples per stretch. Eleven is the least that still reads as a curve. */
const SAMPLES = 11;

export const bandId = "spatial-orbit";

/**
 * A ribbon of light that drifts around the body instead of marching in place: the
 * radius breathes, the altitude rises and dips, the speed eases, and each stretch
 * fades according to its own distance from the camera. Both ends dissolve into haze
 * rather than stopping at a blunt cut.
 */
export const flowingOrbit = defineJellyAttachment({
  id: bandId,
  mount: "character.orbit",
  previewNodes: ["ribbon-5", "haze-5-0", "haze-5-1", "ribbon-3"],
  colors: { ribbon: "#cbd8ff", spark: "#ffe6a8" },
  parameters: {
    size: { min: 0.6, max: 1.8, default: 1 },
    radius: { min: 1.15, max: 1.85, default: 1.42 },
    speed: { min: 0, max: 1.6, default: 0.55 },
    length: { min: 0.5, max: 1, default: 0.86 },
    height: { min: 0, max: 1, default: 0.5 },
    wisp: { min: 0, max: 1, default: 0.6 },
    glow: { min: 0, max: 1, default: 0.5 },
  },
  labels: {
    ribbon: "光带",
    spark: "星点",
    size: "光带粗细",
    radius: "环绕范围",
    speed: "飘动速度",
    length: "光带长度",
    height: "起伏高度",
    wisp: "首尾消散",
    glow: "柔光强度",
  },
  sampleScene({ time }, p, c) {
    const drift = time * p.speed!,
      radius = p.radius!,
      size = p.size!,
      // The far end trails the near one, so the ribbon never closes into a hoop.
      span = 2.4 + p.length! * 4.4,
      // The band sits under the face and climbs as it circles, so it wraps the body
      // instead of cutting straight across it.
      lift = -0.66,
      nodes: Node3D[] = [];
    const pathAt = (tail: number): Vector3 => {
      const angle = drift - tail * span,
        r = radius * (1 + 0.07 * Math.sin(angle * 2 + drift * 0.6)),
        climb =
          p.height! *
          (0.42 * Math.sin(angle * 0.75 + drift * 0.4) +
            0.16 * Math.sin(angle * 1.9 - drift * 0.7) +
            0.1 * Math.sin(angle * 3.3 + drift * 0.55));
      return [Math.sin(angle) * r, lift + climb, Math.cos(angle) * r * FLATTEN];
    };
    // Width eases out of nothing at both ends and fills the middle.
    const widthAt = (tail: number) =>
      Math.max(
        1e-5,
        0.038 * size * (0.1 + 0.9 * Math.sin(Math.PI * tail) ** 0.8),
      );
    const hazeAt = (tail: number) =>
      p.wisp! * (1 - smooth(tail / 0.32) + smooth((tail - 0.68) / 0.32));
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const from = segment / SEGMENTS,
        to = (segment + 1) / SEGMENTS,
        points = Array.from({ length: SAMPLES }, (_, i) =>
          pathAt(from + ((to - from) * i) / (SAMPLES - 1)),
        ),
        middle = pathAt((from + to) / 2),
        // Near stretches read brighter and denser; far ones recede into haze.
        depth = (middle[2] / (radius * FLATTEN) + 1) / 2,
        // Light has no hard body: even the near, full-width stretches stay translucent.
        fade = 0.3 + 0.45 * smooth(depth);
      nodes.push({
        id: `ribbon-${segment}`,
        geometry: taperedStroke(points, (tail) =>
          widthAt(from + (to - from) * tail),
        ),
        material: {
          ...jellyMaterial(c.ribbon!, 0.5),
          gloss: 0.18,
          opacity: fade,
        },
        transform: { position: [0, 0, 0] },
      });
      const haze = hazeAt((from + to) / 2),
        hazeSize = widthAt((from + to) / 2) * 2.6;
      if (haze > 0.02 && p.glow! > 0)
        for (let axis = 0; axis < 2; axis++)
          nodes.push({
            id: `haze-${segment}-${axis}`,
            geometry: glow,
            material: {
              color: c.ribbon!,
              unlit: true,
              doubleSided: true,
              radialOpacity: 0.24 * haze * p.glow!,
            },
            transform: {
              position: middle,
              rotation: [0, axis ? Math.PI / 2 : 0, 0],
              scale: [hazeSize, hazeSize, hazeSize],
            },
          });
    }
    // Stardust shed by the ribbon: each speck fades in and out on its own clock.
    const motes = 16;
    for (let i = 0; i < motes; i++) {
      const a = seed(i + 5),
        b = seed(i + 61),
        tail = fract(a + drift * (0.04 + b * 0.05)),
        age = fract(drift * (0.08 + a * 0.05) + b),
        envelope = Math.sin(Math.PI * age) ** 2,
        presence = smooth(p.glow! * motes - i);
      if (presence === 0) continue;
      const base = pathAt(tail),
        dot = Math.max(1e-5, 0.026 * size * envelope * presence);
      nodes.push({
        id: i === 0 ? "drift-0" : `drift-${i}`,
        geometry: mote,
        material: {
          color: i % 3 === 0 ? c.spark! : c.ribbon!,
          unlit: true,
          opacity: 0.7 + 0.3 * envelope,
        },
        transform: {
          position: [
            base[0] + 0.07 * Math.sin(drift * 1.3 + a * 9),
            base[1] + 0.06 * Math.cos(drift * 1.1 + b * 7),
            base[2] + 0.07 * Math.sin(drift * 0.9 + a * 5),
          ],
          scale: [dot, dot, dot],
        },
      });
    }
    return nodes;
  },
});
