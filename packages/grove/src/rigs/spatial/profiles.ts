import { design as mallow } from "../../skins/mofli-dough/design.js";
import { design as pip } from "../../skins/mofli-bean/design.js";
import { design as pebble } from "../../skins/mofli-stone/design.js";
import type { Geometry3D, Vector3 } from "@mofli/core/scene3d";
export const profiles = [mallow, pip, pebble];
export function profileRadius(shape: number, angle: number) {
  const profile = profiles[shape % 3]!.contour,
    n = profile.length,
    t = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * n,
    i = Math.floor(t),
    u = t - i;
  const a = profile[(i + n - 1) % n]!,
    b = profile[i % n]!,
    c = profile[(i + 1) % n]!,
    d = profile[(i + 2) % n]!;
  return (
    0.5 *
    (2 * b +
      (-a + c) * u +
      (2 * a - 5 * b + 4 * c - d) * u * u +
      (-a + 3 * b - 3 * c + d) * u * u * u)
  );
}
export function profileDepth(shape: number, x: number, y: number) {
  const r = profileRadius(shape, Math.atan2(-y, x));
  return 0.62 * Math.sqrt(Math.max(0.003, 1 - (x * x + y * y) / (r * r)));
}
/** Inflate the original 64-sample artwork through depth; the front silhouette is unchanged. */
export function inflateProfile(
  shape: number,
  segments = 64,
  rings = 20,
): Geometry3D {
  const vertices: Vector3[] = [[0, 0, 0.62]],
    triangles: [number, number, number][] = [];
  for (let j = 1; j < rings; j++) {
    const p = (j / rings) * Math.PI;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        r = profileRadius(shape, a);
      vertices.push([
        Math.cos(a) * r * Math.sin(p),
        -Math.sin(a) * r * Math.sin(p),
        0.62 * Math.cos(p),
      ]);
    }
  }
  const back = vertices.length;
  vertices.push([0, 0, -0.62]);
  for (let i = 0; i < segments; i++) {
    const k = (i + 1) % segments;
    triangles.push([0, 1 + i, 1 + k]);
    for (let j = 0; j < rings - 2; j++) {
      const a = 1 + j * segments + i,
        b = 1 + j * segments + k,
        c = a + segments,
        d = b + segments;
      triangles.push([a, c, b], [b, c, d]);
    }
    triangles.push([
      back,
      1 + (rings - 2) * segments + k,
      1 + (rings - 2) * segments + i,
    ]);
  }
  // Parameterization above runs clockwise from the front; reverse to outward winding.
  for (const triangle of triangles)
    [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
  const sums = vertices.map(() => [0, 0, 0]);
  for (const [a, b, c] of triangles) {
    const p = vertices[a]!,
      q = vertices[b]!,
      r = vertices[c]!,
      u = q.map((v, i) => v - p[i]!),
      v = r.map((v, i) => v - p[i]!);
    const n = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    for (const k of [a, b, c])
      for (let axis = 0; axis < 3; axis++) sums[k]![axis]! += n[axis]!;
  }
  const normals = sums.map((n) => {
    const l = Math.hypot(...n);
    return n.map((x) => x / l) as unknown as Vector3;
  });
  return {
    vertices,
    triangles,
    normals,
    surface: {
      kind: "rounded",
      radii: [
        Math.max(...vertices.map((v) => Math.abs(v[0]))),
        Math.max(...vertices.map((v) => Math.abs(v[1]))),
        0.62,
      ],
    },
  };
}
