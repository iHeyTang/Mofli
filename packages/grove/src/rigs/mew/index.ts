import { headHitArea, headReaction } from '../head-interaction.js';
import {headMountCapabilities} from '@mofli/core';
import {headMounts} from "@mofli/core";
import { catSurfaces, renderMarkings, blendMarkings } from "./markings.js";
export { shapeOptions, expressionOptions, colorOptions } from "./catalog.js";
import { SHAPES } from "./vendor/skins.js";
import { EXPRESSIONS } from "./vendor/expressions.js";
import {
  defineSkin,
  type Rig,
  type RigBinding as Skin,
  type SkinInput,
} from "@mofli/core";
import { softBody } from "./soft-master.js";
import { masterProfile } from "./soft-master.js";
import { BotEngine } from "./vendor/engine.js";
import { SEQUENCE, STATE_BY_ID, POSES } from "./vendor/states.js";
import { characterFrame } from "./frame.js";
export type { Skin, SkinInput, PetDefinition } from "@mofli/core";
const names = [
  "Idle",
  "Thinking",
  "Wink",
  "Surprised",
  "Alert",
  "Notify",
  "Exclaim",
  "Sleep",
  "Egg",
  "Hexagon",
  "Play",
  "Orbit",
  "Burst",
  "Comet",
];
const descriptions = [
  "A soft, wide face with short ears and a gentle blink.",
  "Turns into thinking dots as the ears tuck away.",
  "A wink with asymmetrical ear motion.",
  "Wide Bloub-style eyes with perked ears.",
  "A tilted exclamation mark with folded ears.",
  "A notification dot pops out as the right ear lowers.",
  "The body becomes an exclamation mark as the ears fold in.",
  "Shrinks into a sleeping dot with tucked ears.",
  "Stretches into an egg as the ear roots follow the contour.",
  "Expands into a hexagon with lowered ears.",
  "A bouncing triangle with outward ears.",
  "Orbits sweep around the rotating body and tucked ears.",
  "Bursts apart, then reforms with returning ears.",
  "A flowing comet trail with low, outward ears.",
];
export const catStates = SEQUENCE.map((id, index) => ({
  id,
  index,
  name: names[index]!,
  description: descriptions[index]!,
  duration: STATE_BY_ID.get(id)!.duration,
  posterTime: POSES[id],
}));
interface Prepared {
  engine: BotEngine;
  offset: number;
  skin: Skin;
  from: Skin | null;
  skinAt: number;
}
function profileFor(skin: Skin) {
  const master = masterProfile(
    skin.parameters.earLength,
    skin.parameters.cheek,
  );
  const n = skin.parameters.shape!;
  if (n < 0) return master;
  return SHAPES[n]!.radii.map(
    (r, i) => r + Math.max(0, master[i]! - softBody[i]!) * 0.65,
  );
}
function expressionFor(skin: Skin) {
  return skin.parameters.expression! < 0 || skin.parameters.expression === 16
    ? null
    : EXPRESSIONS[skin.parameters.expression!]!;
}
function selected(skin: Skin) {
  for (const key of ["shape", "expression"])
    if (!Number.isInteger(skin.parameters[key]))
      throw new Error(key + " must be an integer");
  const n = skin.parameters.state!;
  if (!Number.isInteger(n)) throw new Error("Cat state must be an integer");
  return n;
}
function appearance(p: Prepared, t: number): Skin {
  if (!p.from || t >= p.skinAt + 0.4) return p.skin;
  if (t <= p.skinAt) return p.from;
  const k = 1 - (1 - (t - p.skinAt) / 0.4) ** 5;
  return {
    ...p.skin,
    markings: blendMarkings(p.from.markings, p.skin.markings, k),
    parameters: Object.fromEntries(
      Object.entries(p.skin.parameters).map(([key, v]) => [
        key,
        key === "state"
          ? v
          : p.from!.parameters[key]! + (v - p.from!.parameters[key]!) * k,
      ]),
    ),
    colors: Object.fromEntries(
      Object.entries(p.skin.colors).map(([key, v]) => [
        key,
        "#" +
          [1, 3, 5]
            .map((i) =>
              Math.round(
                parseInt(p.from!.colors[key]!.slice(i, i + 2), 16) * (1 - k) +
                  parseInt(v.slice(i, i + 2), 16) * k,
              )
                .toString(16)
                .padStart(2, "0"),
            )
            .join(""),
      ]),
    ),
  };
}
export const mewRig: Rig = {
  mounts: headMountCapabilities,
  id: "cat-head",
  version: 1,
  name: "Mew",
  variants: { eyes: ["capsule", "oval"] },
  surfaces: catSurfaces,
  colors: { body: "#0a0a0c", face: "#f9f9f9" },
  poseParameters: {
    state: { min: 0, max: 13, default: 0 },
    expression: { min: -1, max: 16, default: -1 },
  },
  parameters: {
    shape: { min: -1, max: 7, default: -1 },
    earLength: { min: 12, max: 85, default: 45 },
    cheek: { min: -6, max: 8, default: 0 },
  },
  prepare(skin) {
    const i = selected(skin);
    return {
      engine: new BotEngine(
        100,
        catStates[i]!.id,
        profileFor(skin),
        expressionFor(skin),
      ),
      offset: 0,
      skin,
      from: null,
      skinAt: 0,
    } satisfies Prepared;
  },
  updateSkin({ skin, previousSkin, prepared, skinTime, restart }) {
    const p = prepared as Prepared,
      at = p.offset + skinTime,
      i = selected(skin),
      engine = p.engine.fork();
    const changed = i !== selected(previousSkin);
    if (
      skin.parameters.earLength !== previousSkin.parameters.earLength ||
      skin.parameters.cheek !== previousSkin.parameters.cheek ||
      skin.parameters.shape !== previousSkin.parameters.shape
    )
      engine.setShape(profileFor(skin), at);
    if (skin.parameters.expression !== previousSkin.parameters.expression)
      engine.setExpression(expressionFor(skin) ?? EXPRESSIONS[0]!, at);
    if (changed) engine.setState(catStates[i]!.id, at);
    return {
      prepared: {
        engine,
        offset: restart ? at : p.offset,
        skin,
        from: appearance(p, at),
        skinAt: at,
      } satisfies Prepared,
      transition: "rig",
    };
  },
  sample({ time, state, skin, skinTime, reducedMotion, prepared }) {
    const p = prepared as Prepared,
      i = selected(skin),
      t = reducedMotion ? catStates[i]!.posterTime : p.offset + skinTime;
    const source = (
      reducedMotion
        ? new BotEngine(
            100,
            catStates[i]!.id,
            profileFor(skin),
            expressionFor(skin),
          )
        : p.engine
    ).sample(
      t,
      reducedMotion
        ? undefined
        : {
            look: state.look,
            attention: state.attention,
            pressed: state.pressed,
            reaction: time - state.reactionAt,
        click: state.click,
          },
    );
    const effective = reducedMotion ? skin : appearance(p, t);
    const elapsed = time - state.reactionAt;
    const clicked = state.click ? (reducedMotion ? 0 : headReaction(state.click, elapsed, true).irritation) : !reducedMotion && elapsed >= 0 && elapsed < .68 ? Math.min(1, elapsed/.07, (.68-elapsed)/.16) : 0;
    const irritated = Math.max(skin.parameters.expression === 16 ? 1 : 0, clicked) * source.attachmentSurface.visibility;
    const frame = characterFrame(
      source,
      effective.colors.body!,
      effective.colors.face!,
      effective.variants?.eyes,
      irritated,
      reducedMotion || irritated === 0 ? 0 : state.click ? headReaction(state.click,elapsed,true).roll/7 : Math.exp(-7 * (clicked > 0 ? elapsed : skinTime)) * Math.sin(24 * (clicked > 0 ? elapsed : skinTime)),
    );
    const bodyIndex = frame.shapes.findIndex((s) => s.id === "ink-body");
    frame.shapes.splice(
      bodyIndex + 1,
      0,
      ...renderMarkings(source, effective.markings),
    );
    frame.mounts = headMounts({center:{x:source.attachmentSurface.sil.cx*source.attachmentSurface.radius,y:source.attachmentSurface.sil.cy*source.attachmentSurface.radius},radius:source.attachmentSurface.radius*Math.min(Math.abs(source.attachmentSurface.sil.sx),Math.abs(source.attachmentSurface.sil.sy)),top:source.attachmentSurface.radius*Math.abs(source.attachmentSurface.sil.sy),bottom:Math.max(...source.attachmentPoints.map(p=>p.y)),visibility:source.attachmentSurface.visibility,gaze:source.attachmentSurface.gaze});
    frame.slots = {"head.behind":0,"head.overlay":frame.shapes.length};
    frame.anchors = [
      source.attachmentPoints[40]!,
      source.attachmentPoints[56]!,
    ];
    frame.hitArea = headHitArea;
    return frame;
  },
};
export const defineMewSkin = (input: SkinInput) =>
  defineSkin(mewRig, input);

export { mewRig as catHeadRig, defineMewSkin as defineCatSkin };
