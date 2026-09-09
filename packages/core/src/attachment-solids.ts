import type { AttachmentPoint } from "./attachment-scene.js";
export interface AttachmentFace {
  points: readonly AttachmentPoint[];
  fill: string;
}
interface SolidStyle {
  offset?: AttachmentPoint;
  depthRatio?: number;
}
export type AttachmentSolid =
  | (SolidStyle & {
      kind: "lathe";
      profile: readonly (readonly [number, number])[];
      colors: readonly string[];
    })
  | (SolidStyle & {
      kind: "torus";
      radius: number;
      tubeRadius: number;
      tubeHeight: number;
      yWave?: number;
      colors: readonly string[];
    })
  | (SolidStyle & { kind: "disc"; radius: number; fill: string });
/** Fixed topology for the supported solid primitives, shared by accessory packages. */
export function attachmentSolidFaces(s: AttachmentSolid): AttachmentFace[] {
  const n = 64,
    out: AttachmentFace[] = [],
    ratio = s.depthRatio ?? 1,
    [ox, oy, oz] = s.offset ?? [0, 0, 0];
  const ring = (r: number, y: number, i: number): AttachmentPoint => {
    const t = (i * 2 * Math.PI) / n;
    return [r * Math.cos(t) + ox, y + oy, r * ratio * Math.sin(t) + oz];
  };
  if (s.kind === "disc")
    return [
      {
        points: Array.from({ length: n }, (_, i) => ring(s.radius, 0, i)),
        fill: s.fill,
      },
    ];
  if (!s.colors.length) throw new Error("Solid requires colors");
  if (s.kind === "lathe") {
    for (let j = 0; j < s.profile.length - 1; j++)
      for (let i = 0; i < n; i++) {
        const [r, y] = s.profile[j]!,
          [r1, y1] = s.profile[j + 1]!;
        out.push({
          points: [
            ring(r, y, i),
            ring(r, y, i + 1),
            ring(r1, y1, i + 1),
            ring(r1, y1, i),
          ],
          fill: s.colors[Math.min(j, s.colors.length - 1)]!,
        });
      }
  } else {
    const point = (i: number, j: number): AttachmentPoint => {
      const t = (i * 2 * Math.PI) / n,
        v = (j * Math.PI * 2) / 12,
        r = s.radius + s.tubeRadius * Math.cos(v);
      return [
        r * Math.cos(t) + ox,
        oy + (s.yWave ?? 0) * Math.sin(t) + s.tubeHeight * Math.sin(v),
        r * ratio * Math.sin(t) + oz,
      ];
    };
    for (let j = 0; j < 12; j++)
      for (let i = 0; i < n; i++)
        out.push({
          points: [
            point(i, j),
            point(i + 1, j),
            point(i + 1, j + 1),
            point(i, j + 1),
          ],
          fill: s.colors[Math.min(j, s.colors.length - 1)]!,
        });
  }
  return out;
}
