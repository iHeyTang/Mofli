/*! Radial geometry adapted from Bloub © 2026 Jérémy Perret, MIT. See THIRD_PARTY_NOTICES.md. */
const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r2 = (v: number) => Math.round(v * 100) / 100;
export interface Point {
  x: number;
  y: number;
}
export interface Silhouette {
  radii: number[];
  rot: number;
  cx: number;
  cy: number;
  sx: number;
  sy: number;
}
function validate(s: Silhouette) {
  if (
    s.radii.length < 3 ||
    s.radii.length > 512 ||
    ![s.rot, s.cx, s.cy, s.sx, s.sy, ...s.radii].every(Number.isFinite) ||
    s.radii.some((r) => r < 0)
  )
    throw new Error("Invalid radial silhouette");
}
export function blend(
  a: Silhouette,
  b: Silhouette,
  t: number,
  out?: Silhouette,
): Silhouette {
  validate(a);
  validate(b);
  if (
    a.radii.length !== b.radii.length ||
    !Number.isFinite(t) ||
    t < 0 ||
    t > 1
  )
    throw new Error("Incompatible radial morph");
  const dst = out ?? {
    radii: new Array<number>(a.radii.length),
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
  };
  for (let i = 0; i < a.radii.length; i++) {
    dst.radii[i] = lerp(a.radii[i] ?? 1, b.radii[i] ?? 1, t);
  }
  // Rotation par le chemin le plus court : evite de faire un tour complet
  // quand on passe par exemple de +170deg a -170deg.
  let dRot = b.rot - a.rot;
  while (dRot > Math.PI) dRot -= TAU;
  while (dRot < -Math.PI) dRot += TAU;
  dst.rot = a.rot + dRot * t;
  dst.cx = lerp(a.cx, b.cx, t);
  dst.cy = lerp(a.cy, b.cy, t);
  dst.sx = lerp(a.sx, b.sx, t);
  dst.sy = lerp(a.sy, b.sy, t);
  return dst;
}

/** Projette la silhouette en points ecran. `scale` = rayon de la boule en unites de viewBox. */
export function toPoints(
  s: Silhouette,
  scale: number,
  out: Point[] = [],
): Point[] {
  validate(s);
  if (!Number.isFinite(scale)) throw new Error("Invalid radial scale");
  const count = s.radii.length;
  const COS = Array.from({ length: count }, (_, i) =>
    Math.cos((i / count) * TAU),
  );
  const SIN = Array.from({ length: count }, (_, i) =>
    Math.sin((i / count) * TAU),
  );
  const cr = Math.cos(s.rot);
  const sr = Math.sin(s.rot);
  for (let i = 0; i < count; i++) {
    const r = s.radii[i] ?? 1;
    const x = r * (COS[i] ?? 0);
    const y = r * (SIN[i] ?? 0);
    // rotation puis squash en repere ecran, puis translation
    const rx = x * cr - y * sr;
    const ry = x * sr + y * cr;
    const p = out[i] ?? { x: 0, y: 0 };
    p.x = (rx * s.sx + s.cx) * scale;
    p.y = (ry * s.sy + s.cy) * scale;
    out[i] = p;
  }
  out.length = count;
  return out;
}

/**
 * Polyligne fermee -> cubiques Catmull-Rom.
 *
 * Avec 64 points les tangentes centrees suffisent largement : le contour est
 * lisse au pixel pres meme affiche en 600 px, et la chaine reste courte.
 */
export function closedPath(pts: Point[], tension = 1 / 6): string {
  const n = pts.length;
  if (n < 3) return "";
  const first = pts[0]!;
  let d = `M${r2(first.x)} ${r2(first.y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`;
  }
  return `${d}Z`;
}
