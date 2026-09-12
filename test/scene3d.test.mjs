import { test } from "node:test";

import assert from "node:assert/strict";

import { box3D, ellipsoid3D, cylinder3D } from "@mofli/core/scene3d";

import { PetEngine, PetRegistry } from "@mofli/core";

import {
  spatialRig,
  spatialSkin,
  createSpatialPetScene,
} from "@mofli/grove/rigs/spatial";

const camera = { projection: "orthographic", position: [0, 0, 6], size: 4 };

const flat = (id, color, vertices, triangles = [[0, 1, 2]]) => ({
  id,
  geometry: { vertices, triangles },
  material: { color, unlit: true, doubleSided: true },
});

test("built-in closed meshes have outward, nondegenerate triangles", () => {
  for (const g of [ellipsoid3D(), box3D(), cylinder3D()])
    for (const t of g.triangles) {
      const [a, b, c] = t.map((i) => g.vertices[i]),
        u = b.map((v, i) => v - a[i]),
        v = c.map((v, i) => v - a[i]),
        n = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ];
      assert.ok(Math.hypot(...n) > 1e-8);
      assert.ok(
        n.reduce((sum, v, i) => sum + (v * (a[i] + b[i] + c[i])) / 3, 0) > 0,
      );
    }
});

test("optional spatial rig uses the existing engine and config round-trip without changing default rigs", () => {
  const registry = new PetRegistry().registerPacks({
    id: "spatial-test",
    version: 1,
    rigs: [spatialRig],
    skins: [spatialSkin],
    attachments: [],
  });
  const engine = new PetEngine(spatialRig, spatialSkin, {
    pose: { yaw: 0.6, expression: 2 },
    transitionDuration: 0,
  });
  const config = {
    version: 1,
    skin: engine.getSkin(),
    rigConfig: engine.getRigConfig(),
    pose: engine.getPose(),
    attachments: [],
  };
  assert.deepEqual(
    registry.resolve(config).engine.sampleScene(1),
    engine.sampleScene(1),
  );
  assert.deepEqual(engine.sampleScene(1, true), engine.sampleScene(20, true));
  const baseline = new PetEngine(spatialRig, spatialSkin, {
    pose: { yaw: 0.6, expression: 2 },
    transitionDuration: 0,
  });
  engine.handle({ type: "look", value: { x: 1, y: 0.4 } }, 1);
  assert.notDeepEqual(engine.sampleScene(1.5), baseline.sampleScene(1.5));
  engine.handle({ type: "hover", value: false }, 2);
  assert.deepEqual(engine.sampleScene(2.5), baseline.sampleScene(2.5));
});

test("3D scene sampling bypasses SVG and preserves state, while old rigs remain 2D", () => {
  const rig = {
    ...spatialRig,
    sample() {
      throw new Error("SVG should not run");
    },
  };
  const engine = new PetEngine(rig, spatialSkin);
  assert.equal(engine.dimension, "3d");
  engine.handle({ type: "hover", value: true }, 1);
  engine.handle({ type: "look", value: { x: 0.7, y: -0.3 } }, 1);
  engine.setPose({ yaw: 0.3, expression: 2 }, 1);
  const scene = engine.sampleScene(2);
  assert.deepEqual(scene, engine.sampleScene(2));
  assert.equal(
    scene.nodes[0].children.find((n) => n.id === "body").material.color,
    spatialSkin.colors.body,
  );
  assert.throws(() => engine.sampleScene(-1), /Time/);
  assert.throws(
    () => new PetEngine({ ...spatialRig, sampleScene: undefined }, spatialSkin),
    /sampleScene/,
  );
});

test("3D companions retain their original 2D artwork silhouettes and do not add a mouth or cheeks", async () => {
  const { profiles, inflateProfile } =
    await import("../packages/grove/dist/rigs/spatial/profiles.js");
  for (let shape = 0; shape < 3; shape++) {
    const mesh = inflateProfile(shape);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2,
        r = profiles[shape].contour[i],
        expected = [Math.cos(a) * r, -Math.sin(a) * r];
      assert.ok(
        mesh.vertices.some(
          (v) =>
            Math.abs(v[2]) < 1e-7 &&
            Math.hypot(v[0] - expected[0], v[1] - expected[1]) < 1e-7,
        ),
      );
    }
    for (const n of mesh.normals)
      assert.ok(
        n.every(Number.isFinite) && Math.abs(Math.hypot(...n) - 1) < 1e-6,
      );
    const scene = createSpatialPetScene({ shape, reducedMotion: true });
    assert.ok(
      !scene.nodes[0].children.some(
        (n) => n.geometry && /mouth|cheek|glint/.test(n.id),
      ),
    );
    assert.equal(
      scene.nodes[0].children[0].material.color,
      ["#bff2dc", "#ffddc9", "#d8dcff"][shape],
    );
  }
});

test("jelly actions conserve volume, remain continuous at loop seams, and keep body grounded", async () => {
  const { spatialMotion, spatialActions } =
    await import("../packages/grove/dist/rigs/spatial/choreography.js");
  for (const { index, duration } of spatialActions) {
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * duration,
        a = spatialMotion(index, t, 1.4),
        b = spatialMotion(index, t + 1e-6, 1.4);
      assert.ok(a.y >= 0);
      assert.ok(Math.abs(a.width * a.width * a.stretch - 1) < 1e-9);
      for (const key of ["y", "x", "stretch", "pitch", "roll"])
        assert.ok(
          Math.abs(a[key] - b[key]) < 1e-4,
          `${index} ${key} discontinuity at ${t}`,
        );
      if (i % 30 === 0) {
        const scene = createSpatialPetScene({ action: index, time: t });
        const { scene3DMath: m } =
          await import("../packages/core/dist/scene3d.js");
        const root = scene.nodes[0],
          matrix = m.matrix(root.transform),
          points = root.children[0].geometry.vertices;
        const bottom = Math.min(
          ...points.map(
            (v) =>
              matrix[4] * v[0] +
              matrix[5] * v[1] +
              matrix[6] * v[2] +
              matrix[7],
          ),
        );
        assert.ok(bottom >= -0.780001, "body penetrates ground");
      }
    }
    const start = spatialMotion(index, 0),
      end = spatialMotion(index, duration);
    for (const key of ["y", "x", "stretch", "pitch", "roll"])
      assert.ok(Math.abs(start[key] - end[key]) < 1e-8);
  }
});

test("heart eyes and socket pupils retain each source character expression", () => {
  for (let shape = 0; shape < 3; shape++) {
    const neutral = createSpatialPetScene({
      shape,
      expression: 0,
      reducedMotion: true,
    }).nodes[0].children;
    const love = createSpatialPetScene({
      shape,
      expression: 18,
      reducedMotion: true,
    }).nodes[0].children;
    const target = shape === 2 ? "pupil--1" : "eye-left";
    assert.notDeepEqual(
      neutral.find((n) => n.id === target).geometry,
      love.find((n) => n.id === target).geometry,
    );
    assert.equal(neutral.filter((n) => n.id.startsWith("pupil-")).length, 2);
  }
});

test("3D gaze turns toward screen-space pointer coordinates and releases to natural motion", async () => {
  const { scene3DMath: m } = await import("@mofli/core/scene3d");
  for (const [x, y] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const engine = new PetEngine(spatialRig, spatialSkin);
    engine.handle({ type: "look", value: { x, y } }, 0);
    const root = engine.sampleScene(1).nodes[0],
      matrix = m.matrix(root.transform);
    // Project the local front (+Z) direction: screen Y is opposite world Y.
    const screen = [matrix[2], -matrix[6]];
    if (x) assert.ok(screen[0] * x > 0.2);
    if (y) assert.ok(screen[1] * y > 0.2);
    engine.handle({ type: "hover", value: false }, 1);
    const natural = new PetEngine(spatialRig, spatialSkin).sampleScene(2)
      .nodes[0];
    assert.deepEqual(
      engine.sampleScene(2).nodes[0].transform,
      natural.transform,
    );
  }
});

test("jumps launch quickly, follow constant acceleration and rebound with diminishing energy", async () => {
  const { jumpMotion, spatialActions } =
    await import("../packages/grove/dist/rigs/spatial/choreography.js");
  for (const charged of [false, true]) {
    const launch = charged ? 0.36 : 0.16,
      T = charged ? 0.62 : 0.5,
      H = charged ? 0.74 : 0.48,
      contact = charged ? 0.18 : 0.14;
    const dt = 0.001;
    const velocity = (t) =>
      (jumpMotion(t + dt, charged).y - jumpMotion(t - dt, charged).y) /
      (2 * dt);
    assert.ok(velocity(launch + 0.02) > velocity(launch + T * 0.3));
    assert.ok(Math.abs(velocity(launch + T / 2)) < 1e-8);
    assert.ok(velocity(launch + T * 0.9) < velocity(launch + T * 0.7));
    for (const u of [0.2, 0.4, 0.6, 0.8]) {
      const t = launch + T * u;
      const a =
        (jumpMotion(t + dt, charged).y -
          2 * jumpMotion(t, charged).y +
          jumpMotion(t - dt, charged).y) /
        (dt * dt);
      assert.ok(Math.abs(a + (8 * H) / (T * T)) < 1e-6);
    }
    const first = jumpMotion(launch + T / 2, charged).y;
    const rebound = jumpMotion(
      launch + T + contact + (T * 0.24) / 2,
      charged,
    ).y;
    assert.ok(rebound > 0 && rebound < first * 0.2);
    assert.ok(jumpMotion(launch + T + contact * 0.45, charged).stretch < 1);
  }
  assert.equal(spatialActions[1].duration, 1.35);
  assert.equal(spatialActions[6].duration, 1.8);
});

test("selecting a jump starts its charge phase without resetting it when an expression changes", () => {
  const engine = new PetEngine(spatialRig, spatialSkin);
  engine.setPose({ state: 6 }, 20);
  const selected = engine.sampleScene(20).nodes[0];
  assert.equal(selected.transform.scale[1], 1);
  const compressed = engine.sampleScene(20.2).nodes[0].transform.scale[1];
  assert.ok(compressed < 0.8);
  engine.setPose({ state: 6, expression: 5 }, 20.2);
  assert.equal(
    engine.sampleScene(20.2).nodes[0].transform.scale[1],
    compressed,
  );
});

test("soft 3D face and accessories have closed volumes and smooth finite normals", () => {
  for (const shape of [0, 1, 2])
    for (const expression of [0, 5, 18]) {
      const root = createSpatialPetScene({
        shape,
        expression,
        hat: true,
        ears: true,
        orbit: true,
        reducedMotion: true,
      }).nodes[0];
      const inspect = (node) => {
        if (
          node.geometry &&
          node.id !== "body" &&
          node.material?.radialOpacity === undefined
        ) {
          const { vertices, triangles, normals } = node.geometry;
          assert.equal(normals.length, vertices.length, node.id);
          for (const n of normals)
            assert.ok(
              Math.abs(Math.hypot(...n) - 1) < 1e-6,
              `${node.id}: smooth normal`,
            );
          const edges = new Map();
          let volume = 0;
          for (const [a, b, c] of triangles) {
            for (const [i, j] of [
              [a, b],
              [b, c],
              [c, a],
            ]) {
              const key = [Math.min(i, j), Math.max(i, j)].join(":");
              edges.set(key, (edges.get(key) ?? 0) + 1);
            }
            const p = vertices[a],
              q = vertices[b],
              r = vertices[c];
            volume +=
              p[0] * (q[1] * r[2] - q[2] * r[1]) +
              p[1] * (q[2] * r[0] - q[0] * r[2]) +
              p[2] * (q[0] * r[1] - q[1] * r[0]);
          }
          assert.ok(
            [...edges.values()].every((count) => count === 2),
            `${node.id}: watertight`,
          );
          assert.ok(volume > 0, `${node.id}: outward winding and real depth`);
        }
        node.children?.forEach(inspect);
      };
      root.children.forEach(inspect);
    }
});

test("heart eyes follow the curved face with a small consistent floating gap", async () => {
  const { profileDepth } =
    await import("../packages/grove/dist/rigs/spatial/profiles.js");
  for (const shape of [0, 1]) {
    const root = createSpatialPetScene({
      shape,
      expression: 18,
      reducedMotion: true,
    }).nodes[0];
    const eye = root.children.find((n) => n.id === "eye-left");
    const distances = eye.geometry.vertices.map(
      ([x, y, z]) =>
        z +
        eye.transform.position[2] -
        profileDepth(
          shape,
          x + eye.transform.position[0],
          y + eye.transform.position[1],
        ),
    );
    assert.ok(
      Math.min(...distances) > 0.005,
      "heart floats just above the body",
    );
    assert.ok(
      Math.max(...distances) < 0.095,
      "heart stays close to the curved surface",
    );
    assert.ok(
      Math.max(...distances) > 0.035,
      "heart retains a cushioned front",
    );
  }
});

test("3D blinking closes fully, reopens gently, and keeps pupils continuous", async () => {
  const { spatialBlink } =
    await import("../packages/grove/dist/rigs/spatial/choreography.js");
  assert.equal(spatialBlink(0), 0);
  assert.equal(spatialBlink(3.9), 1);
  assert.equal(spatialBlink(4.1), 0);
  for (const t of [3.8, 3.885, 3.915, 4.07])
    assert.ok(
      Math.abs(spatialBlink(t - 0.00001) - spatialBlink(t + 0.00001)) < 0.001,
    );
  for (const shape of [0, 1, 2])
    for (const expression of [0, 18]) {
      let previous;
      for (let i = 0; i <= 54; i++) {
        const root = createSpatialPetScene({
          shape,
          expression,
          time: 3.8 + i * 0.005,
        }).nodes[0];
        const face = root.children.filter(
          (n) => n.id.startsWith("eye-") || n.id.startsWith("pupil-"),
        );
        if (previous) {
          assert.deepEqual(
            face.map((n) => n.id),
            previous.map((n) => n.id),
            "no sudden pupil removal",
          );
          for (let n = 0; n < face.length; n++) {
            const a = face[n],
              b = previous[n];
            assert.equal(
              a.geometry.vertices.length,
              b.geometry.vertices.length,
            );
            const movement = Math.max(
              ...a.geometry.vertices.map((v, j) =>
                Math.hypot(...v.map((x, k) => x - b.geometry.vertices[j][k])),
              ),
            );
            assert.ok(
              movement < 0.04,
              `${shape}/${expression}: continuous closure`,
            );
          }
        }
        previous = face;
      }
    }
});

test("closed eyelids retain circular thickness and hemispherical ends", async () => {
  const { roundedLidPoint } =
    await import("../packages/grove/dist/rigs/spatial/soft-details.js");
  const length = 0.06,
    radius = 0.016,
    bend = 0.018;
  for (const u of [-0.95, -0.8, -0.5, 0, 0.5, 0.8, 0.95]) {
    const cap = (Math.max(0, (Math.abs(u) - 0.65) / 0.35) * Math.PI) / 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2,
        r = Math.sqrt(1 - u * u);
      const [x, y, z] = roundedLidPoint(
        [u, Math.cos(a) * r, Math.sin(a) * r],
        length,
        radius,
        bend,
      );
      const arch = bend * (1 - (x / (length + radius)) ** 2);
      assert.ok(
        Math.abs(Math.hypot(y - arch, z) - radius * Math.cos(cap)) < 1e-9,
      );
    }
  }
  for (const shape of [0, 1, 2])
    for (const expression of [0, 18]) {
      const eye = createSpatialPetScene({
        shape,
        expression,
        time: 3.9,
      }).nodes[0].children.find((n) => n.id === "eye-left");
      assert.equal(
        eye.material.gloss,
        0,
        "closed lid has no hard specular highlight",
      );
      const v = eye.geometry.vertices;
      assert.ok(
        Math.max(...v.map((p) => p[1])) - Math.min(...v.map((p) => p[1])) >
          0.025,
        "closed lid is not a flattened wire",
      );
      for (const n of eye.geometry.normals)
        assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-6);
    }
});

test("3D has no SVG frame sampling API", () => {
  assert.throws(
    () => new PetEngine(spatialRig, spatialSkin).sample(0),
    /sampleScene.*WebGL/,
  );
});

test("3D transitions preserve position and velocity when interrupted", async () => {
  const { prepareTransition, updateTransition, transitionAt } =
    await import("../packages/grove/dist/rigs/spatial/transitions.js");
  const skin = {
    parameters: { shape: 0, expression: 0, state: 0, elasticity: 1, yaw: 0 },
    colors: spatialSkin.colors,
  };
  let state = prepareTransition(skin);
  for (const [time, parameters] of [
    [1, { expression: 18, state: 3 }],
    [1.12, { expression: 5, shape: 2, state: 2 }],
    [1.24, { expression: 9, shape: 1, state: 7 }],
  ]) {
    const next = updateTransition(
      state,
      { ...skin, parameters: { ...skin.parameters, ...parameters } },
      time,
    );
    const before = transitionAt(state, time),
      after = transitionAt(next, time),
      dt = 0.00001;
    for (const key of Object.keys(before)) {
      assert.ok(Math.abs(before[key] - after[key]) < 1e-8, `${key} position`);
      const oldVelocity =
        (transitionAt(state, time + dt)[key] - before[key]) / dt;
      const newVelocity =
        (transitionAt(next, time + dt)[key] - after[key]) / dt;
      assert.ok(
        Math.abs(oldVelocity - newVelocity) < 0.15,
        `${key} velocity ${oldVelocity} / ${newVelocity}`,
      );
    }
    assert.deepEqual(
      transitionAt(next, time + 0.5),
      transitionAt({ ...next, offset: {}, velocity: {} }, time + 0.5),
    );
    state = next;
  }
});

test("3D expression and shape switches retain the displayed meshes at the switching instant", () => {
  const engine = new PetEngine(spatialRig, spatialSkin);
  const meshes = (scene) =>
    scene.nodes[0].children
      .filter((n) => n.geometry)
      .map((n) => n.geometry.vertices);
  const close = (a, b) => {
    const x = a.flat(2),
      y = b.flat(2);
    assert.equal(x.length, y.length);
    x.forEach((v, i) => assert.ok(Math.abs(v - y[i]) < 1e-8));
  };
  const before = meshes(engine.sampleScene(1));
  engine.setPose({ expression: 18 }, 1);
  close(meshes(engine.sampleScene(1)), before);
  const middle = meshes(engine.sampleScene(1.15));
  engine.setRigConfig({ ...engine.getRigConfig(), shape: 2 }, 1.15);
  close(meshes(engine.sampleScene(1.15)), middle);
  assert.notDeepEqual(meshes(engine.sampleScene(1.55)), middle);
  assert.deepEqual(engine.sampleScene(1.55), engine.sampleScene(1.55));
});

test("3D accessories own independent palettes and parameters, preserve mounts and round-trip", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  const registry = new PetRegistry().registerPacks({
    id: "3d-parts",
    version: 1,
    rigs: [spatialRig],
    skins: [spatialSkin],
    attachments: spatialParts,
  });
  const config = {
    version: 1,
    skin: spatialSkin,
    rigConfig: {},
    pose: { state: 6 },
    attachments: [
      {
        id: "my-hat",
        type: "spatial-hat",
        version: 1,
        colors: { fabric: "#ffaaaa", band: "#ffeedd" },
        parameters: { size: 1.2 },
      },
      {
        id: "my-orb",
        type: "spatial-orbit",
        version: 1,
        colors: { body: "#9988ff" },
        parameters: { speed: 0.2 },
      },
    ],
  };
  const pet = registry.create(config);
  const all = (nodes) => nodes.flatMap((n) => [n, ...all(n.children ?? [])]);
  const scene = pet.sampleScene(0.2),
    nodes = all(scene.nodes);
  assert.ok(nodes.every((n) => /^\w[\w-]*$/.test(n.id)));
  assert.equal(
    nodes.find((n) => n.id === "attachment-my-hat-hat-brim").material.color,
    "#ffaaaa",
  );
  assert.equal(
    nodes.find((n) => n.id === "attachment-my-orb-orbit").material.color,
    "#9988ff",
  );
  assert.equal(
    nodes.find((n) => n.id === "attachment-my-hat-hat").transform.scale[0],
    1.2,
  );
  assert.ok(
    nodes
      .find((n) => n.id === "mount-head-crown")
      .children.some((n) => n.id === "attachment-my-hat"),
  );
  assert.deepEqual(registry.create(pet.exportConfig()).sampleScene(0.2), scene);
  assert.equal(pet.exportConfig().skin.colors.accessory, undefined);
  pet.engine.setSkin(
    { ...spatialSkin, colors: { ...spatialSkin.colors, body: "#eeccaa" } },
    0.2,
  );
  assert.equal(
    all(pet.sampleScene(0.8).nodes).find(
      (n) => n.id === "attachment-my-hat-hat-brim",
    ).material.color,
    "#ffaaaa",
  );
  for (const bad of [
    { parameters: { size: 99 } },
    { parameters: { unknown: 1 } },
    { colors: { fabric: "invalid" } },
    { colors: { unknown: "#ffffff" } },
  ])
    assert.throws(() =>
      registry.resolve({
        ...config,
        attachments: [{ ...config.attachments[0], ...bad }],
      }),
    );
  assert.throws(
    () =>
      registry.resolve({
        ...config,
        attachments: [
          config.attachments[0],
          { ...config.attachments[0], id: "duplicate-mount" },
        ],
      }),
    /occupied/,
  );
  const old = {
    ...config,
    skin: {
      ...spatialSkin,
      colors: { ...spatialSkin.colors, accessory: "#123456" },
    },
    rigConfig: { hat: 1, ears: 1, orbit: 1 },
    attachments: [],
  };
  const migrated = registry.resolve(old).config;
  assert.equal(migrated.attachments.length, 2);
  assert.ok(!migrated.attachments.some((a) => a.type === "spatial-hat"));
  assert.equal(
    migrated.attachments.find((a) => a.type === "spatial-ears").colors.leaf,
    "#123456",
  );
  assert.deepEqual(registry.resolve(migrated).config, migrated);
  assert.equal(old.rigConfig.hat, 1);
});

test("stardust particles are deterministic, continuous, bounded and share geometry", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  const a = spatialParts.find(
    (p) => p.attachment.id === "spatial-orbit",
  ).attachment;
  const params = Object.fromEntries(
    Object.entries(a.parameters).map(([k, r]) => [k, r.default]),
  );
  const sample = (time, p = params) => a.sampleScene({ time }, p, a.colors);
  assert.deepEqual(sample(1), sample(1));
  assert.deepEqual(
    sample(1, { ...params, speed: 0 }),
    sample(20, { ...params, speed: 0 }),
  );
  assert.notDeepEqual(sample(1), sample(1.5));
  assert.ok(
    sample(1, { ...params, density: 1 }).length >
      sample(1, { ...params, density: 0 }).length,
  );
  assert.ok(
    !sample(1, { ...params, glow: 0 }).some((n) => n.id.startsWith("glow")),
  );
  for (const time of [0, 0.2, 1, 5, 20, 100]) {
    const before = sample(time),
      after = sample(time + 0.0001);
    assert.deepEqual(
      before.map((n) => n.id),
      after.map((n) => n.id),
    );
    before.forEach((n, i) => {
      assert.equal(n.geometry, after[i].geometry);
      assert.ok(n.transform.position.every(Number.isFinite));
      assert.ok(n.transform.scale.every((v) => Number.isFinite(v) && v > 0));
      for (let k = 0; k < 3; k++)
        assert.ok(
          Math.abs(n.transform.position[k] - after[i].transform.position[k]) <
            0.001,
        );
    });
  }
  const registry = new PetRegistry().registerPacks({
    id: "dust-budget",
    version: 1,
    rigs: [spatialRig],
    skins: [spatialSkin],
    attachments: spatialParts,
  });
  const scene = registry
    .create({
      version: 1,
      skin: spatialSkin,
      rigConfig: {},
      pose: {},
      attachments: spatialParts
        .filter(({ attachment }) =>
          ["spatial-hat", "spatial-orbit"].includes(attachment.id),
        )
        .map(({ attachment }) => ({
          id: attachment.id,
          type: attachment.id,
          version: 1,
          ...(attachment === a ? { parameters: { density: 1, size: 2 } } : {}),
        })),
    })
    .sampleScene(2);
  const triangles = (nodes) =>
    nodes.reduce(
      (n, node) =>
        n +
        (node.geometry?.triangles.length ?? 0) +
        triangles(node.children ?? []),
      0,
    );
  assert.ok(triangles(scene.nodes) < 20000);
});

test("all ten spatial decorations render with unique nodes and round-trip", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  assert.equal(spatialParts.length, 10);
  const registry = new PetRegistry().registerPacks({
    id: "decorations",
    version: 1,
    rigs: [spatialRig],
    skins: [spatialSkin],
    attachments: spatialParts,
  });
  for (const { attachment } of spatialParts) {
    const engine = registry.create({
      version: 1,
      skin: spatialSkin,
      rigConfig: {},
      pose: {},
      attachments: [{ id: attachment.id, type: attachment.id, version: 1 }],
    });
    const scene = engine.sampleScene(0.4);
    const ids = new Set();
    const walk = (nodes) =>
      nodes.forEach((n) => {
        assert.ok(!ids.has(n.id), `${attachment.id}: duplicate ${n.id}`);
        ids.add(n.id);
        if (n.geometry)
          assert.ok(n.geometry.vertices.every((v) => v.every(Number.isFinite)));
        walk(n.children ?? []);
      });
    walk(scene.nodes);
    assert.deepEqual(
      registry.create(engine.exportConfig()).sampleScene(0.4),
      scene,
    );
  }
});

test("sprout attaches to the central crown surface on each shape", () => {
  for (const shape of [0, 1, 2]) {
    const scene = createSpatialPetScene({ shape, time: 0 });
    const nodes = scene.nodes[0].children;
    const anchor = nodes.find((n) => n.id === "mount-head-crown");
    assert.ok(anchor);
    assert.equal(anchor.transform.position[0], 0);
    assert.equal(anchor.transform.position[2], 0);
    assert.ok(anchor.transform.position[1] > 0.3);
  }
});

test("complete spatial outfits fit the renderer triangle budget", async () => {
  const { spatialParts, spatialSkins } =
    await import("@mofli/grove/rigs/spatial");
  const registry = new PetRegistry().registerPacks({
    id: "outfits",
    version: 1,
    rigs: [spatialRig],
    skins: spatialSkins,
    attachments: spatialParts,
  });
  const count = (nodes) =>
    nodes.reduce(
      (sum, node) =>
        sum +
        (node.geometry?.triangles.length ?? 0) +
        count(node.children ?? []),
      0,
    );
  for (const skin of spatialSkins)
    for (const ears of ["cat-ears", "rabbit-ears"])
      for (const top of ["ears", "flower", "hat", "crown"])
        for (const cheeks of ["cat-whiskers", "blush"]) {
          const attachments = [ears, top, cheeks, "bow-tie", "orbit"].map(
            (id) => ({ id, type: `spatial-${id}`, version: 1 }),
          );
          const scene = registry
            .create({
              version: 1,
              skin,
              pose: {},
              rigConfig: {},
              attachments,
            })
            .sampleScene(0.3);
          assert.ok(
            count(scene.nodes) <= 20000,
            `${skin.name}: ${ears}/${top}/${cheeks}: ${count(scene.nodes)}`,
          );
        }
});

test("crown migration keeps last worn category without changing user colors", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  const registry = new PetRegistry().registerPacks({ id: "crown-migration", version: 1, rigs: [spatialRig], skins: [spatialSkin], attachments: spatialParts });
  const hat = { id: "hat", type: "spatial-hat", version: 1, colors: { fabric: "#abcdef" } };
  const sprout = { id: "sprout", type: "spatial-ears", version: 1, colors: { leaf: "#123456" } };
  for (const attachments of [[hat, sprout], [sprout, hat]]) {
    const input = { version: 1, skin: spatialSkin, rigConfig: {}, pose: {}, attachments };
    const result = registry.resolve(input).config;
    assert.deepEqual(result.attachments, [attachments[1]]);
    assert.equal(input.attachments.length, 2);
    assert.deepEqual(registry.resolve(result).config, result);
  }
  assert.equal(spatialParts.filter(p => p.attachment.mount === "head.crown").length, 4);
  assert.ok(!Object.hasOwn(spatialRig.mounts, "head.crown.sprout"));
});

test("every spatial accessory supplies a translucent gel material", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  const materials = nodes => nodes.flatMap(n => [n.material, ...materials(n.children ?? [])]).filter(Boolean);
  for (const { attachment } of spatialParts) {
    const parameters = Object.fromEntries(Object.entries(attachment.parameters ?? {}).map(([key,rule]) => [key,rule.default]));
    const nodes = attachment.sampleScene({ time: 0 }, parameters, attachment.colors);
    assert.ok(materials(nodes).some(m => m.transmission >= .5), `${attachment.id} must not fall back to opaque plastic`);
  }
});

test("accessory transmission control reaches opaque and gel endpoints", async () => {
  const { spatialParts } = await import("@mofli/grove/rigs/spatial");
  const materials = nodes => nodes.flatMap(n => [n.material, ...materials(n.children ?? [])]).filter(m => m?.transmission !== undefined);
  for (const {attachment:a} of spatialParts) {
    const p = Object.fromEntries(Object.entries(a.parameters).map(([k,v]) => [k,v.default]));
    const opaque = materials(a.sampleScene({time:0}, {...p,transmission:0}, a.colors));
    const gel = materials(a.sampleScene({time:0}, {...p,transmission:1}, a.colors));
    assert.ok(opaque.length && opaque.every(m => m.transmission === 0));
    assert.ok(gel.every(m => m.transmission > .5 && m.transmission <= 1));
  }
});
