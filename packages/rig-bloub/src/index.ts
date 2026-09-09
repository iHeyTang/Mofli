export { shapeOptions, expressionOptions, colorOptions } from "./catalog.js";
import { SHAPES } from "./vendor/skins.js";
import { EXPRESSIONS } from "./vendor/expressions.js";
import type {
  Rig,
  Frame,
  Shape,
  RigBinding as Skin,
  SvgResource,
  Affine2D,
} from "@mofli/core";
import { BotEngine, type BotFrame } from "./vendor/engine.js";
import { SEQUENCE, STATE_BY_ID, POSES } from "./vendor/states.js";
import { mixHex } from "./vendor/skins.js";
import { NOTIF_BLUE } from "./vendor/decor.js";
export const bloubStates = SEQUENCE.map((id, index) => ({
  id,
  index,
  duration: STATE_BY_ID.get(id)!.duration,
  posterTime: POSES[id],
}));
export const bloubDuration = bloubStates.reduce((n, s) => n + s.duration, 0);
const circle = (
  id: string,
  x: number,
  y: number,
  r: number,
  fill: string,
  opacity = 1,
): Shape => ({
  id,
  kind: "ellipse",
  attrs: { cx: x, cy: y, rx: r, ry: r, fill, opacity },
});
/** Translate upstream geometric output, not DOM or serialized SVG, into Mofli primitives. */
export function bloubFrame(
  frame: BotFrame,
  ink = "#0a0a0c",
  paper = "#f9f9f9",
): Frame {
  const resources: SvgResource[] = [
    {
      id: "face-mask",
      kind: "mask",
      shapes: [
        {
          id: "silhouette",
          kind: "path",
          attrs: { d: frame.bodyPath, fill: "#ffffff" },
        },
        ...frame.eyes.map((eye, i): Shape => ({
          id: `eye-${i}`,
          kind: "path",
          attrs: { d: eye.d, fill: "#000000", opacity: eye.alpha },
          transform: eye.matrix
            .slice(7, -1)
            .split(",")
            .map(Number) as unknown as Affine2D,
        })),
        ...(frame.notch
          ? [
              circle(
                "notch",
                frame.notch.x,
                frame.notch.y,
                frame.notch.r,
                "#000000",
              ),
            ]
          : []),
      ],
    },
    ...frame.arcs.map((arc): SvgResource => ({
      id: arc.id,
      kind: "linearGradient",
      x1: arc.grad.x1,
      y1: arc.grad.y1,
      x2: arc.grad.x2,
      y2: arc.grad.y2,
      stops: arc.grad.stops.map((color, i) => ({
        offset: i / (arc.grad.stops.length - 1),
        color,
      })),
    })),
  ];
  const arcs = (side: "back" | "front") =>
    frame.arcs.map((arc): Shape => ({
      id: `${side}-${arc.id}`,
      kind: "path",
      attrs: {
        d: arc[side],
        fill: "none",
        "stroke-width": arc.width,
        "stroke-linecap": "round",
        opacity: arc.opacity,
      },
      paint: { stroke: arc.id },
    }));
  const dots = frame.dots.map((dot, i): Shape => {
    const color =
      dot.color ??
      (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth));
    if (!dot.d)
      return circle(`dot-${i}`, dot.x, dot.y, dot.r, color, dot.opacity);
    const a = ((dot.rot ?? 0) * Math.PI) / 180,
      c = Math.cos(a) * 100,
      s = Math.sin(a) * 100;
    return {
      id: `dot-${i}`,
      kind: "path",
      attrs: { d: dot.d, fill: color, opacity: dot.opacity },
      transform: [c, s, -s, c, dot.x, dot.y],
    };
  });
  return {
    viewBox: { x: -158, y: -158, width: 316, height: 316 },
    resources,
    shapes: [
      ...arcs("back"),
      ...(frame.dotsBehind ? dots : []),
      {
        id: "paper-body",
        kind: "path",
        attrs: { d: frame.bodyPath, fill: paper, opacity: frame.bodyAlpha },
      },
      {
        id: "ink-body",
        kind: "rect",
        attrs: {
          x: -158,
          y: -158,
          width: 316,
          height: 316,
          fill: ink,
          opacity: frame.bodyAlpha,
        },
        mask: "face-mask",
      },
      ...(!frame.dotsBehind ? dots : []),
      ...(frame.notif
        ? [
            circle(
              "notification",
              frame.notif.x,
              frame.notif.y,
              frame.notif.r,
              NOTIF_BLUE,
            ),
          ]
        : []),
      ...arcs("front"),
    ],
    anchors: [],
    bounds: { x: -158, y: -158, width: 316, height: 316 },
  };
}
function configured(skin: Skin, id: (typeof bloubStates)[number]["id"]) {
  return new BotEngine(
    100,
    id,
    skin.parameters.shape! < 0 ? null : SHAPES[skin.parameters.shape!]!.radii,
    skin.parameters.expression! < 0
      ? null
      : EXPRESSIONS[skin.parameters.expression!]!,
  );
}
interface Prepared {
  skin: Skin;
  first: BotEngine;
  fixed: BotEngine | null;
  offset: number;
}
export function bloubPosition(time: number) {
  const phase =
    time >= 0
      ? time % bloubDuration
      : ((time % bloubDuration) + bloubDuration) % bloubDuration;
  let offset = 0;
  for (const state of bloubStates) {
    if (phase < offset + state.duration)
      return { index: state.index, local: phase - offset, offset };
    offset += state.duration;
  }
  return { index: 0, local: 0, offset: 0 };
}
function selectedState(skin: Skin) {
  for (const key of ["shape", "expression"])
    if (!Number.isInteger(skin.parameters[key]))
      throw new Error(key + " must be an integer");
  const selected = skin.parameters.state!;
  if (!Number.isInteger(selected))
    throw new Error("Bloub state must be an integer");
  return selected;
}
/** Reconstruct sequence context without mutating the prepared state while sampling. */
function playback(
  p: Prepared,
  elapsed: number,
): { engine: BotEngine; local: number } {
  const local = p.offset + elapsed;
  if (p.fixed) return { engine: p.fixed, local };
  if (elapsed < bloubStates[0]!.duration) return { engine: p.first, local };
  const pos = bloubPosition(elapsed),
    current = bloubStates[pos.index]!,
    previous = bloubStates[(pos.index + 13) % 14]!,
    at =
      p.offset +
      Math.floor(elapsed / bloubDuration) * bloubDuration +
      pos.offset;
  const engine = configured(p.skin, previous.id);
  engine.reset(previous.id, at - previous.duration);
  engine.setState(current.id, at);
  return { engine, local };
}
export const bloubRig: Rig = {
  id: "bloub-reference",
  version: 1,
  name: "Bloub reference",
  colors: { body: "#0a0a0c", paper: "#f9f9f9" },
  poseParameters: {
    state: { min: -1, max: 13, default: -1 },
    expression: { min: -1, max: 15, default: -1 },
  },
  parameters: {
    shape: { min: -1, max: 7, default: -1 },
  },
  prepare(skin) {
    const selected = selectedState(skin);
    return {
      skin,
      first: configured(skin, "idle"),
      fixed: selected >= 0 ? configured(skin, bloubStates[selected]!.id) : null,
      offset: 0,
    } satisfies Prepared;
  },
  updateSkin({ skin, previousSkin, prepared, skinTime, restart }) {
    const selected = selectedState(skin),
      p = prepared as Prepared;
    if (
      !restart &&
      selected === previousSkin.parameters.state &&
      skin.parameters.shape === previousSkin.parameters.shape &&
      skin.parameters.expression === previousSkin.parameters.expression
    )
      return { prepared: p, transition: "rig" };
    const current = playback(p, skinTime);
    const engine = current.engine.fork();
    if (skin.parameters.shape !== previousSkin.parameters.shape)
      engine.setShape(
        SHAPES[Math.max(0, skin.parameters.shape!)]!.radii,
        current.local,
      );
    if (skin.parameters.expression !== previousSkin.parameters.expression)
      engine.setExpression(
        EXPRESSIONS[Math.max(0, skin.parameters.expression!)]!,
        current.local,
      );
    engine.setState(
      selected < 0 ? "idle" : bloubStates[selected]!.id,
      current.local,
    );
    return {
      prepared: {
        skin,
        first: engine,
        fixed: selected < 0 ? null : engine,
        offset: current.local - (restart ? 0 : skinTime),
      } satisfies Prepared,
      transition: "rig",
    };
  },
  sample({ time, state, skinTime, skin, reducedMotion, prepared }) {
    if (reducedMotion) {
      const selected = selectedState(skin),
        state = bloubStates[Math.max(0, selected)]!;
      return bloubFrame(
        configured(skin, state.id).sample(state.posterTime),
        skin.colors.body!,
        skin.colors.paper!,
      );
    }
    const { engine, local } = playback(prepared as Prepared, skinTime);
    return bloubFrame(
      engine.sample(local, {
        look: state.look,
        attention: state.attention,
        pressed: state.pressed,
        reaction: time - state.reactionAt,
      }),
      skin.colors.body!,
      skin.colors.paper!,
    );
  },
};

import { defineSkin, type SkinInput } from "@mofli/core";
export const defineBloubSkin = (input: SkinInput) =>
  defineSkin(bloubRig, input);
export type { Skin, SkinInput, PetDefinition } from "@mofli/core";
