import { jellyMaterial, defineJellyAttachment } from "./jelly-material.js";
import {
  ellipsoid3D,
  type Geometry3D,
  type Node3D,
  type Vector3,
} from "@mofli/core/scene3d";
import { roundedStroke } from "./soft-details.js";

// Rings stay small on screen, so every volume is built once at module load.
const mote = ellipsoid3D([1, 1, 1], 8, 6);
const bead = ellipsoid3D([1, 1, 1], 16, 10);
/** Squashed diamond: fine at ring distance without a second tessellation. */
const gem: Geometry3D = {
  vertices: [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ],
  triangles: [
    [0, 2, 1],
    [0, 3, 2],
    [0, 4, 3],
    [0, 1, 4],
    [5, 1, 2],
    [5, 2, 3],
    [5, 3, 4],
    [5, 4, 1],
  ],
};
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

/** Orbit is wider than tall: seen from the front it reads as a ring, from the top as a circle. */
const FLATTEN = 0.86;
const LIFT = 0.3;

/** One point on a band: it climbs and dips as it circles, and is wider than it is deep. */
export function ringPoint(
  angle: number,
  radius: number,
  lift: number,
  drift = 0,
): Vector3 {
  return [
    Math.sin(angle) * radius,
    lift + LIFT * Math.cos(angle) + 0.12 * Math.sin(2 * angle) + drift,
    Math.cos(angle) * radius * FLATTEN,
  ];
}

/**
 * A twelve-bead gem ring that reads as a ceremonial planetary orbit: even spacing,
 * long shadows, and one gold bead marking the anchor point of the ring.
 */
export const constellation = defineJellyAttachment({
  id: "spatial-constellation",
  mount: "character.orbit.high",
  previewNodes: ["ring", "bead-0", "glow-0"],
  colors: { metal: "#cfd6ff", gold: "#ffd782" },
  parameters: {
    size: { min: 0.6, max: 1.8, default: 1 },
    radius: { min: 1.2, max: 2, default: 1.58 },
    count: { min: 4, max: 12, default: 12 },
    speed: { min: 0, max: 1.6, default: 0.36 },
    tilt: { min: -0.6, max: 0.6, default: 0.08 },
    shimmer: { min: 0, max: 1, default: 0.45 },
  },
  labels: {
    metal: "星珠",
    gold: "主星",
    size: "星珠大小",
    radius: "环绕范围",
    count: "星珠数量",
    speed: "环绕速度",
    tilt: "轨道倾角",
    shimmer: "闪烁强度",
  },
  sampleScene({ time }, p, c) {
    const t = time * p.speed!,
      radius = p.radius!,
      count = Math.max(1, Math.round(p.count!)),
      scale = p.size!,
      nodes: Node3D[] = [];
    nodes.push({
      id: "ring",
      transform: {
        position: [0, 0, 0],
        rotation: [p.tilt!, 0, p.tilt! * 0.4],
        scale: [1, 1, 1],
      },
    });
    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2,
        angle = t + phase + 0.05 * Math.sin(t * 0.8 + phase),
        anchor = i === 0,
        // Breathing highlight travels bead to bead instead of flashing in unison.
        wave = 1 + p.shimmer! * 0.42 * Math.sin(t * 2.6 - phase * 2),
        size = (anchor ? 0.082 : 0.055) * scale * wave,
        color = anchor ? c.gold! : c.metal!,
        position = ringPoint(
          angle,
          radius,
          0.34 + p.tilt! * 0.9,
          0.03 * Math.sin(t + phase),
        );
      nodes.push({
        id: `bead-${i}`,
        geometry: anchor ? bead : gem,
        material: jellyMaterial(color),
        transform: {
          position,
          rotation: [t * 0.6 + phase, angle * 0.4, phase],
          scale: [size, size * (anchor ? 1 : 1.5), size],
        },
      });
      if (p.shimmer! > 0)
        nodes.push({
          id: `glow-${i}`,
          geometry: glow,
          material: {
            color,
            unlit: true,
            doubleSided: true,
            radialOpacity: 0.16 * p.shimmer! * (anchor ? 1.3 : 1),
          },
          transform: {
            position,
            rotation: [0, 0, 0],
            scale: [size * 3.1, size * 3.1, size * 3.1],
          },
        });
    }
    return nodes;
  },
});

/**
 * A comet whose tail is a cord swept along the band itself, so the trail keeps the
 * band's own curve and never leaves it. The cord is rebuilt per frame, which is what
 * lets it follow the path instead of hanging off the core in a straight line.
 */
export const cometTrail = defineJellyAttachment({
  id: "spatial-comet",
  mount: "character.orbit.trail",
  previewNodes: ["comet-core", "tail-0", "tail-4"],
  colors: { head: "#8fe7ff", tail: "#9d8cff" },
  parameters: {
    size: { min: 0.6, max: 1.6, default: 1 },
    radius: { min: 1.2, max: 1.9, default: 1.44 },
    speed: { min: 0, max: 1.6, default: 0.72 },
    tail: { min: 0.2, max: 1, default: 0.62 },
    wobble: { min: 0, max: 1, default: 0.5 },
    glow: { min: 0, max: 1, default: 0.5 },
  },
  labels: {
    head: "彗核",
    size: "彗核大小",
    radius: "环绕范围",
    speed: "环绕速度",
    tail: "彗尾长度",
    wobble: "起伏幅度",
    glow: "柔光强度",
  },
  sampleScene({ time }, p, c) {
    const t = time * p.speed!,
      radius = p.radius!,
      // The trail is the one flat band: a tilted ring of this radius would swing
      // up through the stardust ring above it.
      lift = -0.9 + p.wobble! * 0.1,
      flat = 0.12,
      size = p.size!,
      spread = 0.25 + p.tail! * 0.7,
      wobble = p.wobble!,
      head = t,
      nodes: Node3D[] = [];
    const point = (angle: number): Vector3 => [
      Math.sin(angle) * radius,
      lift +
        flat * Math.cos(angle) +
        wobble * 0.08 * Math.sin(angle * 2 + t * 1.4),
      Math.cos(angle) * radius * FLATTEN +
        wobble * 0.06 * Math.cos(angle * 3 - t),
    ];
    // A cord swept along the band itself: its crests and troughs are real geometry.
    // Eleven samples are the minimum that still reads as a curve rather than a rod.
    const points = Array.from({ length: 11 }, (_, i) =>
      point(head - (i / 10) * spread),
    );
    for (let i = 0; i < points.length - 1; i++) {
      const tail = i / (points.length - 1),
        // Thin cord near the head, dissolving into haze at the tip.
        radius = Math.max(1e-5, 0.105 * size * (1 - tail) ** 1.6);
      nodes.push({
        id: `tail-${i}`,
        geometry: roundedStroke([points[i]!, points[i + 1]!], radius),
        material: jellyMaterial(c.tail!),
        transform: { position: [0, 0, 0] },
      });
    }
    const headPosition = points[0]!,
      headScale = 0.088 * size;
    nodes.push({
      id: "comet-core",
      geometry: bead,
      material: jellyMaterial(c.head!),
      transform: {
        position: headPosition,
        rotation: [0, -head, 0],
        scale: [headScale, headScale * 1.2, headScale],
      },
    });
    if (p.glow! > 0)
      for (let axis = 0; axis < 2; axis++)
        nodes.push({
          id: `comet-glow-${axis}`,
          geometry: glow,
          material: {
            color: c.head!,
            unlit: true,
            doubleSided: true,
            radialOpacity: 0.2 * p.glow!,
          },
          transform: {
            position: headPosition,
            rotation: [0, axis ? Math.PI / 2 : 0, 0],
            scale: [headScale * 3.6, headScale * 3.6, headScale * 3.6],
          },
        });
    return nodes;
  },
});

/**
 * Fireflies on a figure-eight: the loop, not the ring, separates them from the beads
 * and stardust. Each insect owns an offset phase and its own blink rhythm.
 */
export const fireflyLoop = defineJellyAttachment({
  id: "spatial-fireflies",
  mount: "character.orbit.low",
  previewNodes: [
    "firefly-0",
    "spark-0-0",
    "loop-0",
    "loop-6",
    "loop-12",
    "loop-18",
  ],
  colors: { body: "#eaffa8", spark: "#8fe9c8" },
  parameters: {
    size: { min: 0.6, max: 1.6, default: 1 },
    radius: { min: 0.9, max: 1.6, default: 1.22 },
    count: { min: 4, max: 16, default: 9 },
    speed: { min: 0, max: 1.8, default: 0.62 },
    wander: { min: 0, max: 1, default: 0.4 },
    glow: { min: 0, max: 1, default: 0.55 },
  },
  labels: {
    body: "萤光",
    spark: "光点",
    size: "萤火大小",
    radius: "环绕范围",
    count: "萤火数量",
    speed: "环绕速度",
    wander: "漂移幅度",
    glow: "柔光强度",
  },
  sampleScene({ time }, p, c) {
    const t = time * p.speed!,
      radius = p.radius!,
      count = Math.max(1, Math.round(p.count!)),
      size = p.size!,
      wander = p.wander!,
      nodes: Node3D[] = [];
    /** Lemniscate of Gerono: crosses the body's axis twice per lap. The loop is
     *  biased toward the camera so the swarm reads in front of the pet, not behind it. */
    const loop = (angle: number): Vector3 => [
      Math.sin(angle) * radius,
      -0.12 + 0.09 * Math.cos(2 * angle) + 0.022 * Math.sin(t * 1.3 + angle),
      radius * (0.58 + 0.22 * Math.cos(2 * angle)),
    ];
    for (let i = 0; i < count; i++) {
      const a = seed(i + 3),
        b = seed(i + 47),
        phase = a * Math.PI * 2,
        angle = t * (0.7 + b * 0.4) + phase,
        // Never fully dark: a firefly pulses between dim and bright, it does not vanish.
        blink =
          0.45 + 0.55 * Math.max(0, Math.sin(t * (1.1 + a * 1.4) + phase * 3));
      const base = loop(angle),
        position: Vector3 = [
          base[0] + wander * 0.14 * Math.sin(t * 1.9 + a * 7),
          base[1] + wander * 0.12 * Math.sin(t * 2.3 + b * 5),
          base[2] + wander * 0.12 * Math.cos(t * 1.7 + a * 3),
        ],
        size_ = Math.max(
          1e-5,
          (0.05 + b * 0.022) * size * (0.55 + 0.45 * blink),
        );
      nodes.push({
        id: i === 0 ? "firefly-0" : `firefly-${i}`,
        geometry: mote,
        // The insect itself is a lit gel bead; only its halo is unlit.
        material: jellyMaterial(c.body!),
        transform: {
          position,
          scale: [size_, size_, size_],
        },
      });
      if (p.glow! > 0)
        nodes.push({
          id: i === 0 ? "spark-0-0" : `spark-${i}-0`,
          geometry: glow,
          material: {
            color: i % 3 === 0 ? c.spark! : c.body!,
            unlit: true,
            doubleSided: true,
            // A tight, bright disc: a wide faint one disappears at pet scale.
            radialOpacity: 0.85 * p.glow! * blink,
          },
          transform: {
            position,
            rotation: [0, 0, 0],
            scale: [size_ * 2.2, size_ * 2.2, size_ * 2.2],
          },
        });
    }
    // A faint suggestion of the flight path itself, dropped at zero glow.
    if (p.glow! > 0)
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2,
          trail = loop(angle),
          ghost = Math.max(1e-5, 0.02 * size * p.glow! * (1 - smooth(i / 26)));
        nodes.push({
          id: `loop-${i}`,
          geometry: mote,
          material: { color: c.spark!, unlit: true },
          transform: {
            position: [trail[0], trail[1], trail[2]],
            scale: [ghost, ghost, ghost],
          },
        });
      }
    return nodes;
  },
});
