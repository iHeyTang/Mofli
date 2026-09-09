import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bindPlane,
  bindEllipsoid,
  compose2D,
  transformPoint,
  solveJointChain,
  blendFrames,
} from "@mofli/core";
const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, `${x} != ${y}`);
test("plane anchors inherit parent affine transform without perspective compression", () => {
  const parent = [0, 2, -2, 0, 100, 80];
  const p = bindPlane({ x: 10, y: 5 }, parent);
  assert.deepEqual(
    transformPoint(p.matrix, { x: 3, y: 4 }),
    transformPoint(parent, { x: 13, y: 9 }),
  );
  assert.equal(p.visibility, 1);
  near(Math.hypot(p.matrix[0], p.matrix[1]), 2);
});
test("sphere projects tangent frame, depth compression and back-face visibility", () => {
  const opts = { radii: [60, 60, 60], longitude: 0, latitude: 0 };
  const front = bindEllipsoid(opts);
  assert.deepEqual(front.matrix, [1, 0, 0, 1, 0, 0]);
  near(front.depth, 1);
  const p = bindEllipsoid({
    ...opts,
    pose: { yaw: Math.PI / 3, pitch: 0, roll: 0 },
  });
  near(p.matrix[0], 0.5);
  near(p.matrix[3], 1);
  near(p.matrix[4], (60 * Math.sqrt(3)) / 2);
  near(p.depth, 0.5);
  const back = bindEllipsoid({
    ...opts,
    pose: { yaw: Math.PI, pitch: 0, roll: 0 },
  });
  assert.equal(back.visibility, 0);
  assert.ok(back.depth < 0);
  const rolled = bindEllipsoid({
    ...opts,
    pose: { yaw: 0, pitch: 0, roll: Math.PI / 2 },
  });
  near(rolled.matrix[0], 0);
  near(rolled.matrix[1], 1);
  near(rolled.matrix[2], -1);
});
test("ellipsoid supports independent radii with bounded tangent projection", () => {
  for (const yaw of [-1, -0.5, 0, 0.5, 1])
    for (const pitch of [-0.8, 0, 0.8]) {
      const p = bindEllipsoid({
        radii: [80, 45, 60],
        longitude: 0.4,
        latitude: 0.2,
        pose: { yaw, pitch, roll: 0.3 },
      });
      assert.ok(p.matrix.every(Number.isFinite));
      assert.ok(Math.hypot(p.matrix[0], p.matrix[1]) <= 1 + 1e-12);
      assert.ok(Math.hypot(p.matrix[2], p.matrix[3]) <= 1 + 1e-12);
      assert.ok(p.visibility >= 0 && p.visibility <= 1);
    }
});
test("joint chain preserves segment lengths, clamps local angles and follows root", () => {
  const chain = solveJointChain({ x: 20, y: 30, angle: 0.2 }, [
    { length: 25, angle: 3, min: -0.5, max: 0.5 },
    { length: 18, angle: -3, min: -1, max: 1 },
  ]);
  near(chain[1].angle, 0.7);
  near(chain[2].angle, -0.3);
  near(Math.hypot(chain[1].x - chain[0].x, chain[1].y - chain[0].y), 25);
  near(Math.hypot(chain[2].x - chain[1].x, chain[2].y - chain[1].y), 18);
  assert.throws(() =>
    solveJointChain({ x: 0, y: 0, angle: 0 }, [
      { length: -1, angle: 0, min: 0, max: 1 },
    ]),
  );
});
test("invalid geometry inputs fail explicitly", () => {
  for (const radii of [
    [0, 1, 1],
    [-1, 1, 1],
    [NaN, 1, 1],
    [Infinity, 1, 1],
  ])
    assert.throws(() => bindEllipsoid({ radii, longitude: 0, latitude: 0 }));
  assert.throws(() =>
    bindEllipsoid({ radii: [1, 1, 1], longitude: 0, latitude: Math.PI / 2 }),
  );
  assert.throws(() => bindPlane({ x: NaN, y: 0 }));
});
test("frame interpolation carries typed transforms and preserves endpoints", () => {
  const base = { bounds: { x: 0, y: 0, width: 10, height: 10 }, anchors: [] };
  const shape = {
    id: "eye",
    kind: "ellipse",
    attrs: { cx: 0, cy: 0, rx: 3, ry: 5 },
  };
  const a = {
      ...base,
      shapes: [{ ...shape, transform: [1, 0, 0, 1, 10, 20] }],
    },
    b = { ...base, shapes: [{ ...shape, transform: [0.5, 0, 0, 1, 30, 40] }] };
  assert.deepEqual(
    blendFrames(a, b, 0.5).shapes[0].transform,
    [0.75, 0, 0, 1, 20, 30],
  );
  assert.deepEqual(blendFrames(a, b, 0), a);
  assert.deepEqual(blendFrames(a, b, 1), b);
});

test("affine operations reject malformed matrices and arithmetic overflow", () => {
  assert.throws(() => transformPoint([1, 0, 0, 1, 0], { x: 1, y: 1 }));
  assert.throws(() =>
    compose2D([1e308, 0, 0, 1, 0, 0], [1e308, 0, 0, 1, 0, 0]),
  );
  assert.throws(() =>
    transformPoint([1e308, 0, 0, 1, 0, 0], { x: 1e308, y: 0 }),
  );
});
