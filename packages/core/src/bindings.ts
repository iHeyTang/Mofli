/** Optional geometry utilities. Angles are radians; x right, y down, z toward viewer. */
export type Vec3 = readonly [number, number, number];
export type Affine2D = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];
export interface SurfacePose {
  yaw: number;
  pitch: number;
  roll: number;
}
export interface SurfaceBinding {
  matrix: Affine2D;
  depth: number;
  visibility: number;
}
export const identity2D: Affine2D = Object.freeze([1, 0, 0, 1, 0, 0]);
function finite(...values: number[]) {
  if (!values.every(Number.isFinite))
    throw new Error("Binding coordinates must be finite");
}
function checkedMatrix(m: Affine2D): Affine2D {
  if (m.length !== 6) throw new Error("Affine matrix needs six components");
  finite(...m);
  return m;
}
export function transformPoint(
  m: Affine2D,
  p: { x: number; y: number },
): { x: number; y: number } {
  checkedMatrix(m);
  finite(p.x, p.y);
  const out = {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
  finite(out.x, out.y);
  return out;
}
/** Composition a ∘ b: apply b first, then a. */
export function compose2D(a: Affine2D, b: Affine2D): Affine2D {
  checkedMatrix(a);
  checkedMatrix(b);
  return checkedMatrix([
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]);
}
function rotate(v: Vec3, p: SurfacePose): Vec3 {
  const cy = Math.cos(p.yaw),
    sy = Math.sin(p.yaw),
    cp = Math.cos(p.pitch),
    sp = Math.sin(p.pitch),
    cr = Math.cos(p.roll),
    sr = Math.sin(p.roll);
  const x = cy * v[0] + sy * v[2],
    z = -sy * v[0] + cy * v[2],
    y = cp * v[1] + sp * z,
    z2 = -sp * v[1] + cp * z;
  return [cr * x - sr * y, sr * x + cr * y, z2];
}
function checkPose(p: SurfacePose) {
  finite(p.yaw, p.pitch, p.roll);
}
/** A local flat panel; fixed face proportions, optional affine parent transform. */
export function bindPlane(
  anchor: { x: number; y: number },
  parent: Affine2D = identity2D,
): SurfaceBinding {
  finite(anchor.x, anchor.y, ...parent);
  return {
    matrix: compose2D(parent, [1, 0, 0, 1, anchor.x, anchor.y]),
    depth: 1,
    visibility: 1,
  };
}
/** Orthographic projection of an ellipsoid point and its unit tangent frame.
 * Returns a local-to-screen matrix for features measured in surface units.
 * No clipping: callers decide whether to fade/omit the back-facing feature.
 */
export function bindEllipsoid(options: {
  radii: Vec3;
  longitude: number;
  latitude: number;
  pose?: SurfacePose;
  center?: { x: number; y: number };
}): SurfaceBinding {
  const { radii: r, longitude: u, latitude: v } = options,
    p = options.pose ?? { yaw: 0, pitch: 0, roll: 0 },
    center = options.center ?? { x: 0, y: 0 };
  finite(...r, u, v, center.x, center.y);
  checkPose(p);
  if (r.some((x) => x < 1e-6 || x > 1e6) || Math.abs(v) >= Math.PI / 2)
    throw new Error("Radii must be 1e-6–1e6; latitude must be non-polar");
  const cu = Math.cos(u),
    su = Math.sin(u),
    cv = Math.cos(v),
    sv = Math.sin(v);
  const point: Vec3 = [r[0] * su * cv, r[1] * sv, r[2] * cu * cv];
  const normalize = (a: Vec3): Vec3 => {
    const n = Math.hypot(...a);
    if (!Number.isFinite(n) || n < 1e-12) throw new Error("Degenerate tangent");
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const tangent = normalize([r[0] * cu, 0, -r[2] * su]);
  const normal = normalize([(su * cv) / r[0], sv / r[1], (cu * cv) / r[2]]);
  // normal × tangent points down at the front center; orthogonal even on an ellipsoid.
  const down: Vec3 = [
    normal[1] * tangent[2] - normal[2] * tangent[1],
    normal[2] * tangent[0] - normal[0] * tangent[2],
    normal[0] * tangent[1] - normal[1] * tangent[0],
  ];
  const a = rotate(tangent, p),
    b = rotate(down, p),
    q = rotate(point, p),
    n = rotate(normal, p);
  finite(...a, ...b, ...q, ...n, q[0] + center.x, q[1] + center.y);
  const t = Math.max(0, Math.min(1, n[2] / 0.15));
  return {
    matrix: [a[0], a[1], b[0], b[1], q[0] + center.x, q[1] + center.y],
    depth: n[2],
    visibility: t * t * (3 - 2 * t),
  };
}
export interface Joint {
  length: number;
  angle: number;
  min: number;
  max: number;
}
export interface JointPose {
  x: number;
  y: number;
  angle: number;
}
/** Forward kinematics with local joint limits. No IK, ground contact, or gravity assumptions. */
export function solveJointChain(
  root: JointPose,
  joints: readonly Joint[],
): JointPose[] {
  finite(root.x, root.y, root.angle);
  const out = [{ ...root }];
  let current = { ...root };
  for (const joint of joints) {
    finite(joint.length, joint.angle, joint.min, joint.max);
    if (joint.length <= 0 || joint.min > joint.max)
      throw new Error("Invalid joint constraint");
    const angle =
      current.angle + Math.max(joint.min, Math.min(joint.max, joint.angle));
    current = {
      x: current.x + Math.cos(angle) * joint.length,
      y: current.y + Math.sin(angle) * joint.length,
      angle,
    };
    finite(current.x, current.y, current.angle);
    out.push(current);
  }
  return out;
}
