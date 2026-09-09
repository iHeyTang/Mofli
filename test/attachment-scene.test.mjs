import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defineAttachment,
  renderAttachmentScene,
  headMounts,
  composeAttachments,
  PetEngine,
} from "@mofli/core";
import { bloubRig } from "@mofli/grove/rigs/bloub";
import { doughSkin } from "@mofli/grove/skins/mofli-dough";
const node = {
  id: "mark",
  geometry: { kind: "path", d: "M -.1 0 Q 0 -.2 .1 0 C .1 .1 -.1 .1 -.1 0 Z" },
  attrs: { fill: "#aaa" },
};
const ctx = {
  time: 0,
  project: ([x, y, z]) => ({ x: x * 100 + 10, y: y * 100 + 20, depth: z }),
  surface: ([x, y]) => ({ x: x * 100 + 10, y: y * 100 + 20, depth: 1 }),
};
test("plain JSON scene projects in the rig frame and both members follow yaw", () => {
  const nodes = ["left", "right"].map((member) => ({
    ...node,
    id: member,
    member,
    surface: true,
  }));
  const definition = JSON.parse(
    JSON.stringify({
      id: "marks",
      mount: "head.cheeks",
      slot: "head.overlay",
      scene: { version: 1, nodes },
    }),
  );
  const a = defineAttachment(definition),
    e = new PetEngine(bloubRig, doughSkin, { pose: { state: 0 } });
  const render = (yaw) => {
    const frame = e.sample(0, true);
    frame.mounts = headMounts({
      center: { x: 0, y: 0 },
      radius: 100,
      top: 100,
      bottom: 100,
      visibility: 1,
      gaze: { yaw, pitch: 0, roll: 0 },
    });
    return composeAttachments(frame, [
      { id: "marks", attachment: a },
    ]).shapes.filter((s) => s.id.startsWith("attachment-"));
  };
  const front = render(0),
    turn = render(20);
  assert.equal(front.length, 2);
  assert.notEqual(front[0].attrs.d, front[1].attrs.d);
  for (let i = 0; i < 2; i++)
    assert.notEqual(front[i].attrs.d, turn[i].attrs.d);
});
test("shared sway preserves the local root and moves the tip deterministically", () => {
  const scene = {
    version: 1,
    nodes: [
      {
        ...node,
        geometry: {
          kind: "polygon",
          points: [
            [0, 0, 0],
            [0, 0.6, 0],
            [0.1, 0.6, 0],
          ],
        },
        motion: { kind: "sway" },
      },
    ],
  };
  const a = renderAttachmentScene(scene, ctx),
    b = renderAttachmentScene(scene, { ...ctx, time: 1 });
  assert.equal(a[0].attrs.d.split(" L")[0], b[0].attrs.d.split(" L")[0]);
  assert.notEqual(a[0].attrs.d, b[0].attrs.d);
  assert.deepEqual(b, renderAttachmentScene(scene, { ...ctx, time: 1 }));
});
test("solid faces sort back to front and cull by projected winding", () => {
  const face = (z) => ({
    fill: "#aaa",
    points: [
      [0, 0, z],
      [0, 1, z],
      [1, 0, z],
    ],
  });
  const shapes = renderAttachmentScene(
    {
      version: 1,
      nodes: [
        {
          kind: "mesh",
          id: "surface-",
          cull: "negative",
          faces: [face(1), face(-1)],
        },
      ],
    },
    ctx,
  );
  assert.deepEqual(
    shapes.map((s) => s.id),
    ["surface-1", "surface-0"],
  );
  assert.ok(shapes.every((s) => s.attrs.opacity === 1));
  const reversed = renderAttachmentScene(
    {
      version: 1,
      nodes: [{ kind: "mesh", id: "f", cull: "positive", faces: [face(0)] }],
    },
    ctx,
  );
  assert.equal(reversed[0].attrs.opacity, 0);
});
test("author mistakes fail instead of silently changing the silhouette", () => {
  const render = (geometry) =>
    renderAttachmentScene({ version: 1, nodes: [{ ...node, geometry }] }, ctx);
  for (const d of [
    "M 0 0 A 1 1 0 0 1 1 1",
    "M 0 0 L 1",
    "L 0 0",
    "M 0 0 M 1 1",
  ])
    assert.throws(() => render({ kind: "path", d }));
  assert.throws(() =>
    render({
      kind: "polygon",
      points: [
        [NaN, 0, 0],
        [0, 1, 0],
        [1, 0, 0],
      ],
    }),
  );
  assert.throws(
    () => renderAttachmentScene({ version: 1, nodes: [node, node] }, ctx),
    /Duplicate/,
  );
  assert.throws(
    () =>
      defineAttachment({
        id: "x",
        mount: "x",
        slot: "x",
        scaleParameter: "missing",
        scene: { version: 1, nodes: [] },
      }),
    /scale/,
  );
});
test("procedural author receives only time and resolved parameters", () => {
  let input;
  const a = defineAttachment({
    id: "x",
    mount: "x",
    slot: "x",
    scene: (i) => {
      input = i;
      return { version: 1, nodes: [node] };
    },
  });
  a.sample(ctx, {});
  assert.deepEqual(Object.keys(input).sort(), ["parameters", "time"]);
});
