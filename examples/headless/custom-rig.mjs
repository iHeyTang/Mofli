// Run after npm run build: node examples/headless/custom-rig.mjs
// Public package exports only. No studio, browser, or built-in rig dependency.
import { RigRegistry } from "mofli";
const lantern = {
  id: "lantern",
  version: 1,
  name: "Lantern",
  colors: { body: "#E2BD76" },
  parameters: { size: { min: 20, max: 60, default: 40 } },
  channels: { lift: { min: 0, max: 40, default: 0 } },
  prepare(skin) {
    return { radius: skin.parameters.size };
  },
  sample({ skin, motion, prepared }) {
    const cy = 160 - motion.lift,
      r = prepared.radius;
    return {
      shapes: [
        {
          id: "light",
          kind: "ellipse",
          attrs: { cx: 160, cy, rx: r, ry: r, fill: skin.colors.body },
        },
      ],
      anchors: [{ x: 160, y: cy - r }],
      bounds: { x: 160 - r, y: cy - r, width: r * 2, height: r * 2 },
    };
  },
};
const registry = new RigRegistry().register(lantern);
const engine = registry.create({
  version: 1,
  id: "amber",
  name: "Amber",
  rig: "lantern",
  colors: {},
});
const bow = {
  version: 1,
  id: "bow",
  duration: 1,
  priority: 10,
  tracks: {
    lift: [
      { at: 0, value: 0 },
      { at: 0.5, value: 20 },
      { at: 1, value: 0 },
    ],
  },
};
engine.play(bow, 0);
console.log(JSON.stringify(engine.sample(0.5), null, 2));
