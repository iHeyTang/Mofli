import type { Rig } from "./index.js";

/** WebGL scene geometry. Right-handed coordinates: X right, Y up, Z toward the viewer. */
export type Vector3 = readonly [number, number, number];
export interface Geometry3D {
  vertices: readonly Vector3[];
  /** Optional outward vertex normals enable smooth per-pixel lighting. */
  normals?: readonly Vector3[];
  /** Optional primitive dimensions for geometry tooling. */
  surface?:
    | { kind: "ellipsoid" | "rounded"; radii: Vector3 }
    | { kind: "cylinder"; radius: number; height: number; topRadius: number };
  triangles: readonly (readonly [number, number, number])[];
  /** Optional coplanar convex faces avoid unnecessary diagonal splits. */ faces?: readonly (readonly number[])[];
}
export interface Transform3D {
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
}
export interface Material3D {
  color: string;
  unlit?: boolean;
  /** Soft specular response. */
  gloss?: number;
  /** Screen-space transmission for rounded jelly bodies. */
  transmission?: number;
  /** Scattering of transmitted light: 0 clear, 1 frosted. Does not blur foreground surfaces. */
  transmissionRoughness?: number;
  /** Peak opacity of a soft disc in local XY unit coordinates; fades to zero at radius 1. */
  radialOpacity?: number;
  /** Defaults to smooth when geometry provides normals. */
  smooth?: boolean;
  doubleSided?: boolean;
}
export interface Node3D {
  id: string;
  transform?: Transform3D;
  geometry?: Geometry3D;
  material?: Material3D;
  children?: readonly Node3D[];
}
export interface Camera3D {
  projection: "orthographic" | "perspective";
  position?: Vector3;
  /** Euler angles in radians, applied X then Y then Z. */
  rotation?: Vector3;
  /** Vertical extent for orthographic projection. */
  size?: number;
  /** Vertical field of view in radians. */
  fov?: number;
  near?: number;
  far?: number;
}
export interface Scene3D {
  /** Mount ID to an anchor node in the scene hierarchy. */
  mounts?: Record<string,string>;
  nodes: readonly Node3D[];
  camera: Camera3D;
  /** World-space direction toward the light. */
  light?: { direction: Vector3; ambient?: number };
}
type Matrix = number[];
const EPS = 1e-7;
const add = (a: Vector3, b: Vector3): Vector3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const sub = (a: Vector3, b: Vector3): Vector3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const mul = (a: Vector3, s: number): Vector3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vector3, b: Vector3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector3, b: Vector3): Vector3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vector3): Vector3 => {
  const n = Math.hypot(...a);
  if (!Number.isFinite(n) || n < EPS)
    throw new Error("Degenerate 3D direction");
  return mul(a, 1 / n);
};
const finiteVector = (v: Vector3) => v.length === 3 && v.every(Number.isFinite);
const identity = (): Matrix => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a: Matrix, b: Matrix): Matrix {
  const r = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      for (let k = 0; k < 4; k++)
        r[row * 4 + col]! += a[row * 4 + k]! * b[k * 4 + col]!;
  return r;
}
function point(m: Matrix, p: Vector3): Vector3 {
  return [
    m[0]! * p[0] + m[1]! * p[1] + m[2]! * p[2] + m[3]!,
    m[4]! * p[0] + m[5]! * p[1] + m[6]! * p[2] + m[7]!,
    m[8]! * p[0] + m[9]! * p[1] + m[10]! * p[2] + m[11]!,
  ];
}
function matrix(t: Transform3D = {}): Matrix {
  const p = t.position ?? [0, 0, 0],
    r = t.rotation ?? [0, 0, 0],
    s = t.scale ?? [1, 1, 1];
  if (![p, r, s].every(finiteVector) || s.some((v) => v <= 0))
    throw new Error(
      "3D transforms require finite coordinates and positive scales",
    );
  const [x, y, z] = r,
    cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z);
  return [
    cz * cy * s[0],
    (cz * sy * sx - sz * cx) * s[1],
    (cz * sy * cx + sz * sx) * s[2],
    p[0],
    sz * cy * s[0],
    (sz * sy * sx + cz * cx) * s[1],
    (sz * sy * cx - cz * sx) * s[2],
    p[1],
    -sy * s[0],
    cy * sx * s[1],
    cy * cx * s[2],
    p[2],
    0,
    0,
    0,
    1,
  ];
}
function cameraMatrix(camera: Camera3D): Matrix {
  const m = matrix({
    position: camera.position ?? [0, 0, 6],
    rotation: camera.rotation,
  });
  const r = [
    m[0]!,
    m[4]!,
    m[8]!,
    0,
    m[1]!,
    m[5]!,
    m[9]!,
    0,
    m[2]!,
    m[6]!,
    m[10]!,
    0,
    0,
    0,
    0,
    1,
  ];
  const p = point(r, [-m[3]!, -m[7]!, -m[11]!]);
  r[3] = p[0];
  r[7] = p[1];
  r[11] = p[2];
  return r;
}
function normalTransform(world: Matrix, normal: Vector3): Vector3 {
  const a: Vector3 = [world[0]!, world[4]!, world[8]!],
    b: Vector3 = [world[1]!, world[5]!, world[9]!],
    c: Vector3 = [world[2]!, world[6]!, world[10]!];
  return unit(
    add(
      add(mul(cross(b, c), normal[0]), mul(cross(c, a), normal[1])),
      mul(cross(a, b), normal[2]),
    ),
  );
}
export function ellipsoid3D(
  radii: Vector3 = [1, 1, 1],
  segments = 32,
  rings = 16,
): Geometry3D {
  if (
    !finiteVector(radii) ||
    radii.some((v) => v <= 0) ||
    !Number.isInteger(segments) ||
    !Number.isInteger(rings) ||
    segments < 3 ||
    segments > 128 ||
    rings < 2 ||
    rings > 64
  )
    throw new Error("Invalid ellipsoid geometry");
  const vertices: Vector3[] = [[0, radii[1], 0]],
    triangles: [number, number, number][] = [],
    faces: number[][] = [];
  for (let j = 1; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        b = (j / rings) * Math.PI;
      vertices.push([
        radii[0] * Math.sin(b) * Math.cos(a),
        radii[1] * Math.cos(b),
        radii[2] * Math.sin(b) * Math.sin(a),
      ]);
    }
  const bottom = vertices.length;
  vertices.push([0, -radii[1], 0]);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    triangles.push([0, 1 + next, 1 + i]);
    faces.push([0, 1 + next, 1 + i]);
    for (let j = 0; j < rings - 2; j++) {
      const a = 1 + j * segments + i,
        b = 1 + j * segments + next,
        c = a + segments,
        d = b + segments;
      triangles.push([a, b, c], [b, d, c]);
      faces.push([a, b, d, c]);
    }
    triangles.push([
      bottom,
      1 + (rings - 2) * segments + i,
      1 + (rings - 2) * segments + next,
    ]);
    faces.push([
      bottom,
      1 + (rings - 2) * segments + i,
      1 + (rings - 2) * segments + next,
    ]);
  }
  return {
    vertices,
    triangles,
    faces,
    surface: { kind: "ellipsoid", radii },
    normals: vertices.map((v) =>
      unit([v[0] / radii[0] ** 2, v[1] / radii[1] ** 2, v[2] / radii[2] ** 2]),
    ),
  };
}
export function box3D(size: Vector3 = [1, 1, 1]): Geometry3D {
  if (!finiteVector(size) || size.some((v) => v <= 0))
    throw new Error("Invalid box geometry");
  const vertices: Vector3[] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ].map((v) => [
    (v[0]! * size[0]) / 2,
    (v[1]! * size[1]) / 2,
    (v[2]! * size[2]) / 2,
  ]);
  return {
    vertices,
    triangles: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [3, 7, 6],
      [3, 6, 2],
      [0, 4, 7],
      [0, 7, 3],
      [1, 2, 6],
      [1, 6, 5],
    ],
  };
}
export function cylinder3D(
  radius = 1,
  height = 1,
  segments = 32,
  topRadius = radius,
): Geometry3D {
  if (
    ![radius, height, topRadius].every(Number.isFinite) ||
    radius <= 0 ||
    height <= 0 ||
    topRadius < 0 ||
    !Number.isInteger(segments) ||
    segments < 3 ||
    segments > 128
  )
    throw new Error("Invalid cylinder geometry");
  const vertices: Vector3[] = [
      [0, -height / 2, 0],
      [0, height / 2, 0],
    ],
    triangles: [number, number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(
      [radius * Math.cos(a), -height / 2, radius * Math.sin(a)],
      [topRadius * Math.cos(a), height / 2, topRadius * Math.sin(a)],
    );
  }
  const normals: Vector3[] = [
    [0, -1, 0],
    [0, 1, 0],
  ];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2,
      n = unit([Math.cos(a), (radius - topRadius) / height, Math.sin(a)]);
    normals.push(n, n);
  }
  const capStart = vertices.length;
  for (let i = 0; i < segments; i++) {
    vertices.push(vertices[2 + i * 2]!, vertices[3 + i * 2]!);
    normals.push([0, -1, 0], [0, 1, 0]);
  }
  for (let i = 0; i < segments; i++) {
    const a = 2 + i * 2,
      b = 2 + ((i + 1) % segments) * 2,
      ca = capStart + i * 2,
      cb = capStart + ((i + 1) % segments) * 2;
    triangles.push(
      [0, ca, cb],
      [1, cb + 1, ca + 1],
      [a, a + 1, b],
      [b, a + 1, b + 1],
    );
  }
  const faces: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const a = 2 + i * 2,
      b = 2 + ((i + 1) % segments) * 2,
      ca = capStart + i * 2,
      cb = capStart + ((i + 1) % segments) * 2;
    faces.push([0, ca, cb], [1, cb + 1, ca + 1], [a, a + 1, b + 1, b]);
  }
  return {
    vertices,
    triangles,
    normals,
    faces,
    surface: { kind: "cylinder", radius, height, topRadius },
  };
}

/** @internal Shared coordinate math for browser backends. */
export const scene3DMath = {
  identity,
  multiply,
  matrix,
  cameraMatrix,
  normalTransform,
  unit,
  cross,
  sub,
};

export interface SpatialRig extends Rig {
  dimension: "3d";
  sampleScene(input: Parameters<Rig["sample"]>[0]): Scene3D;
}
/** Define a 3D pet sampled as a scene for WebGL. */
export function defineSpatialRig(
  input: Omit<SpatialRig, "dimension" | "sample">,
): SpatialRig {
  return {
    updateSkin: ({ skin }) => ({
      prepared: input.prepare?.(skin),
      transition: "rig",
    }),
    ...input,
    dimension: "3d",
    sample: () => {
      throw new Error("3D pets require sampleScene() and WebGL");
    },
  };
}
