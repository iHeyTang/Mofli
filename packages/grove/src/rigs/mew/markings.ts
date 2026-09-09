import type { Shape, SurfaceMark } from "@mofli/core";
import { headBasis } from "@mofli/core/spherical-face";
import type { BotFrame } from "./vendor/engine.js";
import { mixHex } from "./vendor/skins.js";

// Surface-local coordinates are chosen by the rig, not by each animation state.
export const catSurfaces = {
  forehead: { description: "Forehead, follows face turn and head deformation" },
  leftCheek: { description: "Left cheek, clipped at the head and eyes" },
  rightCheek: { description: "Right cheek, clipped at the head and eyes" },
};
const regions: Record<string, [number, number, number, number]> = {
  forehead: [0, -0.53, 0.4, 0.28],
  leftCheek: [-0.48, 0.25, 0.29, 0.32],
  rightCheek: [0.48, 0.25, 0.29, 0.32],
};
export function blendMarkings(
  a: SurfaceMark[] = [],
  b: SurfaceMark[] = [],
  k: number,
): SurfaceMark[] {
  const from = new Map(a.map((m) => [m.slot + ":" + m.id, m]));
  const to = new Map(b.map((m) => [m.slot + ":" + m.id, m]));
  return [...new Set([...from.keys(), ...to.keys()])].flatMap((id) => {
    const x = from.get(id),
      y = to.get(id);
    if (x && y && x.slot === y.slot)
      return [
        {
          ...y,
          opacity: x.opacity + (y.opacity - x.opacity) * k,
          color: mixHex(x.color, y.color, k),
          points: x.points.map((p, i) => ({
            x: p.x + (y.points[i]!.x - p.x) * k,
            y: p.y + (y.points[i]!.y - p.y) * k,
          })),
        },
      ];
    // Distinct slots keep their own stable identities during an interrupted change.
    return [
      x && { ...x, opacity: x.opacity * (1 - k) },
      y && { ...y, opacity: y.opacity * k },
    ].filter((m): m is SurfaceMark => !!m && m.opacity > 0.0001);
  });
}
export function renderMarkings(
  frame: BotFrame,
  marks: SurfaceMark[] = [],
): Shape[] {
  const { sil, gaze, radius: R, visibility } = frame.attachmentSurface;
  const basis = headBasis(gaze);
  return marks.map((mark, index) => {
    const [cx, cy, sx, sy] = regions[mark.slot]!;
    const vertices = mark.points.map((p) => {
      const x = cx + p.x * sx,
        y = cy + p.y * sy;
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      return [0, 1, 2].map(
        (i) => basis.right[i]! * x + basis.down[i]! * y + basis.f[i]! * z,
      );
    });
    // Clip in surface space at the horizon before projecting, avoiding mirrored back-face marks.
    const clipped: number[][] = [];
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i]!,
        b = vertices[(i + 1) % vertices.length]!;
      if (a[2]! >= 0) clipped.push(a);
      if (a[2]! >= 0 !== b[2]! >= 0) {
        const t = a[2]! / (a[2]! - b[2]!);
        clipped.push(a.map((v, j) => v + (b[j]! - v) * t));
      }
    }
    const points = clipped.map(([x = 0, y = 0]) => {
      let t = (Math.atan2(y, x) - sil.rot) / (Math.PI * 2);
      t = (((t % 1) + 1) % 1) * sil.radii.length;
      const i = Math.floor(t),
        f = t - i;
      const fit =
        sil.radii[i]! * (1 - f) + sil.radii[(i + 1) % sil.radii.length]! * f;
      return {
        x: (x * fit * sil.sx + sil.cx) * R,
        y: (y * fit * sil.sy + sil.cy) * R,
      };
    });
    const d =
      points.length >= 3
        ? points
            .map(
              (p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`,
            )
            .join(" ") + " Z"
        : "M0 0 Z";
    return {
      id: `mark-${mark.id}-${index}`,
      kind: "path",
      mask: "face-mask",
      attrs: {
        d,
        fill: mark.color,
        opacity: mark.opacity * frame.bodyAlpha * visibility,
      },
    };
  });
}
