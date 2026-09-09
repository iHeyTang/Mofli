// npm run build && node examples/headless/jointed-rig.mjs
import { RigRegistry, solveJointChain } from "mofli";
const rig = {
  id: "jointed-tail",
  version: 1,
  name: "Jointed tail",
  parameters: { length: { min: 12, max: 32, default: 24 } },
  colors: { body: "#708D7A" },
  channels: { bend: { min: -0.6, max: 0.6, default: 0 } },
  sample({ skin, motion }) {
    const points = solveJointChain(
      { x: 130, y: 160, angle: 0 },
      Array.from({ length: 4 }, () => ({
        length: skin.parameters.length,
        angle: motion.bend,
        min: -0.6,
        max: 0.6,
      })),
    );
    return {
      shapes: points.slice(1).map((p, i) => ({
        id: `segment-${i}`,
        kind: "line",
        attrs: {
          x1: points[i].x,
          y1: points[i].y,
          x2: p.x,
          y2: p.y,
          stroke: skin.colors.body,
          "stroke-width": 9,
          "stroke-linecap": "round",
        },
      })),
      anchors: points,
      bounds: { x: 20, y: 20, width: 280, height: 280 },
    };
  },
};
const engine = new RigRegistry().register(rig).create({
  version: 1,
  id: "tail",
  name: "Tail",
  rig: rig.id,
  colors: {},
});
engine.play(
  {
    version: 1,
    id: "wag",
    duration: 1,
    priority: 10,
    tracks: {
      bend: [
        { at: 0, value: 0 },
        { at: 0.5, value: 0.5 },
        { at: 1, value: 0 },
      ],
    },
  },
  0,
);
console.log(JSON.stringify(engine.sample(0.5), null, 2));
