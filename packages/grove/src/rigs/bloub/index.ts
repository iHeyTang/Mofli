import {headMountCapabilities} from '@mofli/core';
import {validateBloubDesign,type BloubDesign} from "./design.js";
import {resolveEyeComponent} from "./eye-component.js";
import {renderEyeComponent} from "./eye-component.js";
import {pupilPath,expressiveEye} from "./eye-geometry.js";
import {characterExpression, characterCatalogExpression, softSocketExpression, type CharacterMood} from "./character-expression.js";
import { characterProfiles } from "./character-profiles.js";
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
  eyes: "solid" | "socket" = "solid",
): Frame {
  const mounts=frame.mounts;
  if (eyes === "socket" || frame.eyes.some(eye=>eye.geometry))
    frame = {
      ...frame,
      eyes: frame.eyes.map((eye) => {
        if (eye.lid) {
          const m=eye.matrix.slice(7,-1).split(',').map(Number),sx=eyes==='socket'?2:1,sy=eyes==='socket'?.85:1;
          return {...eye,d:renderEyeComponent(eye.lid),matrix:`matrix(${m[0]!*sx},${m[1]!*sx},${m[2]!*sy},${m[3]!*sy},${m[4]},${m[5]})`};
        }
        if (eye.geometry) {
          const contour=expressiveEye(eye.geometry,eyes==='socket');
          const m=eye.matrix.slice(7,-1).split(',').map(Number);
          return {...eye,d:contour.d,matrix:`matrix(${m[0]!*contour.sx},${m[1]!*contour.sx},${m[2]!*contour.sy},${m[3]!*contour.sy},${m[4]},${m[5]})`};
        }
        if (eye.curved || eyes !== 'socket') return eye;
        const m = eye.matrix.slice(7, -1).split(",").map(Number);
        const start = /^M([-\d.]+) ([-\d.]+)A([-\d.]+)/.exec(eye.d)!;
        const rx = Math.abs(Number(start[1])),
          ry = Number(start[3]) - Number(start[2]);
        const d = `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 Z`;
        return {
          ...eye,
          d,
          matrix: `matrix(${m[0]! * 2},${m[1]! * 2},${m[2]! * 0.85},${m[3]! * 0.85},${m[4]},${m[5]})`,
        };
      }),
    };
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
  const pupils: Shape[] = [];
  if (eyes === "socket") {
    frame.eyes.forEach((eye, i) => {
      const matrix = eye.matrix
        .slice(7, -1)
        .split(",")
        .map(Number) as unknown as Affine2D;
      const id = `socket-${i}`;
      resources.push({
        id,
        kind: "mask",
        shapes: [
          { id: "opening", kind: "path", attrs: { d: eye.d, fill: "#ffffff" } },
        ],
      });
      // Pupil travel is bounded in the eye's tangent plane. The same projection
      // and eyelid transform drives both layers; the opening clips every pose.
      const dx = Math.max(-2.5, Math.min(2.5, matrix[4] * 0.04 + (eye.pupilX ?? 0)));
      const dy = Math.max(-3, Math.min(3, matrix[5] * 0.04 + (eye.pupilY ?? 0)));
      pupils.push({
        id: `pupil-${i}`,
        kind: "path",
        attrs: {
          d:pupilPath(dx,dy,3.5*(eye.pupil??1),7*(eye.pupil??1),eye.heart??0),
          fill: ink,
          opacity: eye.alpha * frame.bodyAlpha * (eye.pupilAlpha ?? 1),
        },
        transform: matrix,
        mask: id,
      });
    });
  }
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
  const result: Frame = {
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
      ...pupils,
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
    mounts,
    slots: {"head.overlay": 0},
    anchors: [],
    bounds: { x: -158, y: -158, width: 316, height: 316 },
  };
  result.slots = {"head.behind":0,"head.overlay":result.shapes.length};
  return result;
}
function profile(skin: Skin) {
  const shape = skin.parameters.shape!;
  return shape < 0
    ? null
    : shape < 8
      ? SHAPES[shape]!.radii
      : (skin.design as BloubDesign|undefined)?.contour ?? characterProfiles[shape - 8]!;
}
function expression(skin: Skin) {
  const index = skin.parameters.expression!;
  if (!skin.parameters.customFace)
    return index < 0 ? null : EXPRESSIONS[index === 17 ? 4 : index === 16 ? 14 : index]!;
  const base = EXPRESSIONS[index === 17 ? 4 : index === 16 ? 14 : Math.max(0, index)]!;
  const configured = {
    ...base,
    gaze:
      index < 0
        ? {
            yaw: skin.parameters.faceYaw!,
            pitch: skin.parameters.facePitch!,
            roll: skin.parameters.faceRoll!,
          }
        : base.gaze,
    split: skin.parameters.eyeSpacing!,
    eyes: base.eyes.map((e) => ({
      ...e,
      w: (e.w * skin.parameters.eyeWidth!) / 0.186,
      h: (e.h * skin.parameters.eyeHeight!) / 0.412,
    })) as typeof base.eyes,
  };
  const design=skin.design as BloubDesign|undefined;
  if(design){
    // Authored artwork is the neutral design; rig controls scale that artwork.
    const widthScale = skin.parameters.eyeWidth! / (skin.rigConfig?.eyeWidth ?? 0.186);
    const heightScale = skin.parameters.eyeHeight! / (skin.rigConfig?.eyeHeight ?? 0.412);
    const eyeCatalog = structuredClone(design.expressions);
    for (const pair of eyeCatalog) for (const eye of pair) {
      eye.w *= widthScale;
      eye.h *= heightScale;
      eye.lid = resolveEyeComponent(eye, skin.variants?.eyes === 'socket');
    }
    const eyes=eyeCatalog[index+1]!;
    const limit=(v:number,n:number)=>Math.max(-n,Math.min(n,v)),socket=skin.variants?.eyes==='socket';
    return {...configured,eyes,character:design.motion,eyeCatalog,gaze:{yaw:limit(configured.gaze.yaw,socket?20:28),pitch:limit(configured.gaze.pitch,socket?18:26),roll:limit(configured.gaze.roll,socket?18:22)}};
  }
  const mood = ({'-1':'rest',0:'rest',2:'startled',4:'happy',11:'curious',16:'irritated',17:'love'} as Record<number,CharacterMood>)[index];
  const styled = mood && skin.variants?.temperament ? characterExpression(configured,skin.variants.temperament,mood) : skin.variants?.temperament ? characterCatalogExpression(configured,skin.variants.temperament,index) : {...(skin.variants?.eyes === "socket" ? softSocketExpression(configured) : configured)};
  // Expression eye artwork must not reset the rig's authored head attitude.
  // Larger custom sockets need a bounded side view, not a forced frontal view.
  const limit=(v:number,n:number)=>Math.max(-n,Math.min(n,v));
  const socket=skin.variants?.eyes === "socket";
  return {...styled,gaze:{yaw:limit(configured.gaze.yaw,socket?20:28),pitch:limit(configured.gaze.pitch,socket?18:26),roll:limit(configured.gaze.roll,socket?18:22)}};
}
function configured(skin: Skin, id: (typeof bloubStates)[number]["id"]) {
  return new BotEngine(100, id, profile(skin), expression(skin));
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
  validateDesign:validateBloubDesign,
  mounts: headMountCapabilities,
  id: "bloub-reference",
  version: 1,
  name: "Bloub reference",
  colors: { body: "#0a0a0c", paper: "#f9f9f9" },
  variants: { eyes: ["solid", "socket"], temperament: ["mellow", "spry", "steady"] },
  poseParameters: {
    state: { min: -1, max: 13, default: -1 },
    expression: { min: -1, max: 17, default: -1 },
  },
  parameters: {
    shape: { min: -1, max: 10, default: -1 },
    customFace: { min: 0, max: 1, default: 0 },
    eyeWidth: { min: 0.08, max: 0.6, default: 0.186 },
    eyeHeight: { min: 0.1, max: 0.65, default: 0.412 },
    eyeSpacing: { min: 10, max: 32, default: 15.46 },
    faceYaw: { min: -20, max: 20, default: 0 },
    facePitch: { min: -15, max: 15, default: 0 },
    faceRoll: { min: -15, max: 15, default: 0 },
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
      skin.parameters.expression === previousSkin.parameters.expression &&
      JSON.stringify(skin.parameters) ===
        JSON.stringify(previousSkin.parameters) && JSON.stringify(skin.variants) === JSON.stringify(previousSkin.variants) && JSON.stringify(skin.design) === JSON.stringify(previousSkin.design)
    )
      return { prepared: p, transition: "rig" };
    const current = playback(p, skinTime);
    const engine = current.engine.fork();
    if (skin.parameters.shape !== previousSkin.parameters.shape || JSON.stringify(skin.design)!==JSON.stringify(previousSkin.design))
      engine.setShape(profile(skin), current.local);
    if (
      JSON.stringify(skin.parameters) !==
      JSON.stringify(previousSkin.parameters) || JSON.stringify(skin.variants) !== JSON.stringify(previousSkin.variants) || JSON.stringify(skin.design)!==JSON.stringify(previousSkin.design)
    )
      engine.setExpression(expression(skin), current.local);
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
        skin.variants?.eyes === "socket" ? "socket" : "solid",
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
      skin.variants?.eyes === "socket" ? "socket" : "solid",
    );
  },
};

import { defineSkin, type SkinInput } from "@mofli/core";
export const defineBloubSkin = (input: SkinInput) =>
  defineSkin(bloubRig, input);
export type { Skin, SkinInput, PetDefinition } from "@mofli/core";
