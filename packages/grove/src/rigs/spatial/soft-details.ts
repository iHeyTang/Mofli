import type { Geometry3D, Vector3 } from "@mofli/core/scene3d";

// Smooth vertex normals are shared across every ring, including the rounded ends.
export function detailMesh(
  vertices: Vector3[],
  triangles: readonly (readonly [number, number, number])[],
): Geometry3D {
  const normals: [number, number, number][] = vertices.map(() => [0, 0, 0]);
  for (const [a, b, c] of triangles) {
    const p = vertices[a]!,
      q = vertices[b]!,
      r = vertices[c]!;
    const u = q.map((v, i) => v - p[i]!) as [number, number, number];
    const v = r.map((v, i) => v - p[i]!) as [number, number, number];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    for (const index of [a, b, c])
      for (let k = 0; k < 3; k++) normals[index]![k]! += n[k]!;
  }
  for (const n of normals) {
    const length = Math.hypot(...n) || 1;
    for (let k = 0; k < 3; k++) n[k]! /= length;
  }
  return { vertices, triangles, normals };
}

/** Sweep a circular cord along a surface curve, finishing with hemispherical tips. */
export function roundedStroke(points: Vector3[], radius: number): Geometry3D {
  const vertices: Vector3[] = [],
    triangles: [number, number, number][] = [];
  const sides = 12;
  const tangent = (i: number): Vector3 => {
    const a = points[Math.max(0, i - 1)]!,
      b = points[Math.min(points.length - 1, i + 1)]!;
    const d = b.map((v, k) => v - a[k]!) as [number, number, number],
      length = Math.hypot(...d);
    return d.map((v) => v / length) as [number, number, number];
  };
  const ring = (p: Vector3, t: Vector3, radial: number, along: number) => {
    const length = Math.hypot(t[0], t[1]) || 1;
    const n: Vector3 = [-t[1] / length, t[0] / length, 0];
    const b: Vector3 = [
      t[1] * n[2] - t[2] * n[1],
      t[2] * n[0] - t[0] * n[2],
      t[0] * n[1] - t[1] * n[0],
    ];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      vertices.push(
        p.map(
          (v, k) =>
            v +
            t[k]! * along +
            radial * (n[k]! * Math.cos(a) + b[k]! * Math.sin(a)),
        ) as [number, number, number],
      );
    }
  };
  const first = points[0]!,
    last = points[points.length - 1]!,
    start = tangent(0),
    end = tangent(points.length - 1);
  // A single pole avoids zero-area triangles at either tip.
  vertices.push(
    first.map((v, k) => v - start[k]! * radius) as [number, number, number],
  );
  for (let i = 1; i <= 4; i++) {
    const a = ((i / 4) * Math.PI) / 2;
    ring(first, start, Math.sin(a) * radius, -Math.cos(a) * radius);
  }
  for (let i = 1; i < points.length; i++)
    ring(points[i]!, tangent(i), radius, 0);
  for (let i = 1; i < 4; i++) {
    const a = ((i / 4) * Math.PI) / 2;
    ring(last, end, Math.cos(a) * radius, Math.sin(a) * radius);
  }
  const rings = (vertices.length - 1) / sides;
  for (let j = 0; j < sides; j++) {
    const next = (j + 1) % sides;
    triangles.push([0, 1 + next, 1 + j]);
    for (let i = 0; i < rings - 1; i++) {
      const a = 1 + i * sides + j,
        b = 1 + i * sides + next,
        c = a + sides,
        d = b + sides;
      triangles.push([a, b, c], [b, d, c]);
    }
  }
  const pole = vertices.length;
  vertices.push(
    last.map((v, k) => v + end[k]! * radius) as [number, number, number],
  );
  for (let j = 0; j < sides; j++)
    triangles.push([
      1 + (rings - 1) * sides + j,
      1 + (rings - 1) * sides + ((j + 1) % sides),
      pole,
    ]);
  return detailMesh(vertices, triangles);
}

/** A closed cushion: rounded heart outline, domed front AND back, no pointed cusp. */
export function cushionHeart(): Geometry3D {
  const outline = [
    [0, 0.55],
    [-0.36, 0.82],
    [-0.78, 0.7],
    [-0.96, 0.32],
    [-0.8, -0.12],
    [-0.42, -0.55],
    [0, -0.86],
    [0.42, -0.55],
    [0.8, -0.12],
    [0.96, 0.32],
    [0.78, 0.7],
    [0.36, 0.82],
  ];
  const sides = 48,
    rings = 12,
    vertices: Vector3[] = [[0, 0, -0.3]],
    triangles: [number, number, number][] = [];
  for (let i = 1; i < rings; i++) {
    const a = (i / rings) * Math.PI,
      radial = Math.sin(a),
      depth = -Math.cos(a) * 0.3;
    for (let j = 0; j < sides; j++) {
      const phase = (j / sides) * outline.length,
        k = Math.floor(phase),
        t = phase - k;
      const p = [-1, 0, 1, 2].map(
        (d) => outline[(k + d + outline.length) % outline.length]!,
      );
      const xy = [0, 1].map(
        (c) =>
          0.5 *
          (2 * p[1]![c]! +
            (-p[0]![c]! + p[2]![c]!) * t +
            (2 * p[0]![c]! - 5 * p[1]![c]! + 4 * p[2]![c]! - p[3]![c]!) *
              t *
              t +
            (-p[0]![c]! + 3 * p[1]![c]! - 3 * p[2]![c]! + p[3]![c]!) *
              t *
              t *
              t),
      );
      vertices.push([xy[0]! * radial, xy[1]! * radial, depth]);
    }
  }
  for (let j = 0; j < sides; j++) {
    const next = (j + 1) % sides;
    triangles.push([0, 1 + next, 1 + j]);
    for (let i = 0; i < rings - 2; i++) {
      const a = 1 + i * sides + j,
        b = 1 + i * sides + next,
        c = a + sides,
        d = b + sides;
      triangles.push([a, b, c], [b, d, c]);
    }
  }
  const pole = vertices.length;
  vertices.push([0, 0, 0.3]);
  for (let j = 0; j < sides; j++)
    triangles.push([
      1 + (rings - 2) * sides + j,
      1 + (rings - 2) * sides + ((j + 1) % sides),
      pole,
    ]);
  return detailMesh(vertices, triangles);
}

/** Revolved rounded profile, useful for padded hats and seamless rolled trim. */
export function softRevolution(
  radius: number,
  height: number,
  exponent: number,
  hole = 0,
): Geometry3D {
  const sides = 32,
    rings = 12,
    vertices: Vector3[] = [],
    triangles: [number, number, number][] = [];
  // Closed torus for a rolled band; closed superellipsoid for a padded crown.
  const signed = (v: number) => Math.sign(v) * Math.abs(v) ** exponent;
  if (!hole) vertices.push([0, -height, 0]);
  const count = hole ? rings : rings - 1;
  for (let i = 0; i < count; i++) {
    const a = hole
      ? (i / rings) * Math.PI * 2
      : -Math.PI / 2 + ((i + 1) / rings) * Math.PI;
    const r =
      hole + radius * (hole ? Math.cos(a) : Math.abs(Math.cos(a)) ** exponent);
    const y = height * (hole ? Math.sin(a) : signed(Math.sin(a)));
    for (let j = 0; j < sides; j++) {
      const t = (j / sides) * Math.PI * 2;
      vertices.push([r * Math.cos(t), y, r * Math.sin(t)]);
    }
  }
  const offset = hole ? 0 : 1;
  for (let i = 0; i < (hole ? count : count - 1); i++)
    for (let j = 0; j < sides; j++) {
      const a = offset + i * sides + j,
        b = offset + i * sides + ((j + 1) % sides),
        c = offset + ((i + 1) % count) * sides + j,
        d = offset + ((i + 1) % count) * sides + ((j + 1) % sides);
      triangles.push([a, c, b], [b, c, d]);
    }
  if (!hole) {
    const top = vertices.length;
    vertices.push([0, height, 0]);
    for (let j = 0; j < sides; j++) {
      triangles.push([0, 1 + j, 1 + ((j + 1) % sides)]);
      triangles.push([
        1 + (count - 1) * sides + j,
        top,
        1 + (count - 1) * sides + ((j + 1) % sides),
      ]);
    }
  }
  return {
    ...detailMesh(vertices, triangles),
    ...(!hole
      ? {
          surface: {
            kind: "rounded" as const,
            radii: [radius, height, radius] as Vector3,
          },
        }
      : {}),
  };
}

const openHeart = cushionHeart();
/** Soften the heart lobes into a single lid before closing, without swapping meshes. */
export function closingHeart(closure: number): Geometry3D {
  const blend = Math.min(1, closure * 1.6);
  const vertices = openHeart.vertices.map((v, i): Vector3 => {
    if (i === 0 || i === openHeart.vertices.length - 1) return v;
    const ring = Math.floor((i - 1) / 48) + 1,
      angle = (((i - 1) % 48) / 48) * Math.PI * 2;
    const radius = Math.sin((ring / 12) * Math.PI);
    return [
      v[0] * (1 - blend) - Math.sin(angle) * radius * blend,
      v[1] * (1 - blend) + Math.cos(angle) * radius * blend,
      v[2],
    ];
  });
  return detailMesh(vertices, openHeart.triangles);
}

/** Map a spherical eye onto a curved capsule with a circular section and round caps. */
export function roundedLidPoint(
  unit: Vector3,
  halfLength: number,
  radius: number,
  bend: number,
): Vector3 {
  const u = Math.max(-1, Math.min(1, unit[0]));
  const cap = (Math.max(0, (Math.abs(u) - 0.65) / 0.35) * Math.PI) / 2;
  const x =
    Math.abs(u) <= 0.65
      ? (u / 0.65) * halfLength
      : Math.sign(u) * (halfLength + radius * Math.sin(cap));
  const section = radius * Math.cos(cap);
  const cross = Math.hypot(unit[1], unit[2]);
  const arch = bend * (1 - (x / (halfLength + radius)) ** 2);
  return [
    x,
    arch + (cross > 1e-8 ? (unit[1] / cross) * section : 0),
    cross > 1e-8 ? (unit[2] / cross) * section : 0,
  ];
}

/** One shared eye topology for oval, heart, curved and closed expressions. */
export function expressionEye(
  width: number,
  height: number,
  depth: number,
  arc: number,
  heart: number,
  bend: number,
  blink: number,
): Geometry3D {
  const vertices = openHeart.vertices.map((p, i): Vector3 => {
    let unit: Vector3;
    if (i === 0) unit = [0, 0, -1];
    else if (i === openHeart.vertices.length - 1) unit = [0, 0, 1];
    else {
      const ring = Math.floor((i - 1) / 48) + 1,
        a = (((i - 1) % 48) / 48) * Math.PI * 2,
        r = Math.sin((ring / 12) * Math.PI);
      unit = [
        -Math.sin(a) * r,
        Math.cos(a) * r,
        -Math.cos((ring / 12) * Math.PI),
      ];
    }
    const base: Vector3 = [
      (unit[0] * (1 - heart) + p[0] * heart) * width,
      (unit[1] * (1 - heart) + p[1] * heart) * height,
      unit[2] * depth,
    ];
    const curved = roundedLidPoint(
      unit,
      Math.max(0.015, width - height),
      height,
      bend,
    );
    const closure = blink * (1 - arc),
      u = Math.max(0, Math.min(1, closure));
    const k = u * u * (3 - 2 * u);
    const closed = roundedLidPoint(
      unit,
      Math.max(0.025, width * 0.82 - 0.016),
      0.016,
      0.018,
    );
    return base.map(
      (v, j) => ((1 - arc) * v + arc * curved[j]!) * (1 - k) + closed[j]! * k,
    ) as [number, number, number];
  });
  return detailMesh(vertices, openHeart.triangles);
}
