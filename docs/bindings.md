# Optional surface and joint bindings

Bindings are reusable mathematics exported from `@mofli/core`, not mandatory base classes for every Rig. They return data and do not depend on SVG, DOM, React or Vue. The browser renderer accepts typed `Shape.transform` matrices.

## Coordinates and composition

Scene coordinates are x-right / y-down. Surface z points toward the viewer. All angles are **radians**. `Affine2D` is `[a,b,c,d,tx,ty]` with `x'=a*x+c*y+tx`, `y'=b*x+d*y+ty`. `compose2D(parent,local)` applies local first. A feature's geometry is expressed in its own local coordinates; do not also translate its cx/cy into scene coordinates or the translation will be applied twice.

## Flat surface

```ts
import { bindPlane } from "@mofli/core";
const eye = {
  id: "left-eye",
  kind: "ellipse" as const,
  attrs: { cx: 0, cy: 0, rx: 6, ry: 10, fill: "#223344" },
  transform: bindPlane({ x: 140, y: 150 }).matrix,
};
```

`bindPlane(anchor,parent?)` inherits the parent affine transform and keeps depth/visibility at 1. It does not impose sphere-like narrowing on a flat robot screen.

## Sphere or ellipsoid

```ts
import { bindEllipsoid, compose2D } from "@mofli/core";
const projected = bindEllipsoid({
  radii: [60, 50, 55],
  longitude: -0.35,
  latitude: 0,
  pose: { yaw: 0.2, pitch: 0.1, roll: 0 },
});
const eye = {
  id: "left-eye",
  kind: "ellipse" as const,
  attrs: {
    cx: 0,
    cy: 0,
    rx: 5,
    ry: 10,
    fill: "#223344",
    opacity: projected.visibility,
  },
  transform: compose2D([1, 0, 0, 1, 160, 160], projected.matrix),
};
```

The helper rotates the surface point, its normal and its unit tangent frame, then projects them orthographically. Equal radii describe a sphere. Unequal radii support an ellipsoid. The returned matrix creates foreshortening and tilt without changing the feature's authored geometry. `depth` is the normal's z component; `visibility` smoothly falls to zero near the silhouette. The caller decides whether to use opacity, remove the shape, or apply a mask.

Yaw rotates the front toward +x, pitch toward +y, then roll rotates in the screen plane. Latitude excludes the exact poles, where longitude does not define a unique tangent. Radii are limited to [1e-6,1e6] to avoid numerical degeneracy. This is a **local tangent approximation**, appropriate for small features, not a curved decal mesh or perspective renderer.


## Joint chains

```ts
import { solveJointChain } from "@mofli/core";
const leg = solveJointChain({ x: 120, y: 160, angle: Math.PI / 2 }, [
  { length: 25, angle: 0.2, min: -0.6, max: 0.6 },
  { length: 22, angle: 0.5, min: 0, max: 1.2 },
]);
```

The result includes the root and each segment endpoint with its absolute angle. Each input angle is **local to its parent**, clamped to that joint's min/max. Lengths are preserved. This is forward kinematics: it does not solve a foot target, enforce ground contact, create a walk cycle or handle collisions. Those belong to a quadruped Rig's additional constraints and behaviors.


## Transitions and limits

Shape matrices are included in generic frame interpolation. This fallback linearly interpolates affine coefficients for C0 continuity; it is **not** rotation-aware pose interpolation and can shrink a large rotating shape between endpoints. A Rig-owned pose mixer should interpolate joint angles on their chosen path before forward kinematics, keeping lengths invariant throughout. The joint solver itself preserves lengths for every input pose.

The renderer rejects non-finite or wrongly-sized transform arrays before DOM mutation, and removes stale transform attributes when a shape returns to untransformed coordinates. Raw SVG transform strings are not accepted.

Tests cover known sphere projections, ellipsoid tangent bounds, hidden faces, parent composition, joint lengths and local limits, transform interpolation, complete face containment across skin/interaction extremes, and transformed SVG rendering.
