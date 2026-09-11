import type { RigBinding } from "@mofli/core";
import { profiles } from "./profiles.js";
import { spatialMotion } from "./choreography.js";
export type Values = Record<string, number>;
export interface SpatialTransition {
  target: Values;
  action: number;
  actionAt: number;
  at: number;
  offset: Values;
  velocity: Values;
}
export function appearance(
  skin: Pick<RigBinding, "parameters" | "colors">,
): Values {
  const p = skin.parameters,
    shape = Math.round(p.shape ?? 0),
    expression = Math.round(p.expression ?? 0);
  const out: Values = { ...p };
  for (let i = 0; i < 6; i++) out[`shape${i}`] = Number(i === shape);
  const pair = profiles[Math.min(shape, 2)]!.expressions[expression]!;
  pair.forEach((value, side) => {
    const c = value as Record<string, number>;
    const arc = Number(!!c.bend),
      heart = c.eyeHeart ?? 0;
    const data = {
      width:
        arc || heart
          ? c.w! * 0.46
          : (c.w! / 0.14) * 0.065 * (shape === 2 ? 2 : 1),
      height: heart
        ? c.h! * 0.46
        : arc
          ? Math.max(0.007, c.h! * 0.23)
          : ((0.088 * c.h!) / 0.19) * (shape === 2 ? 0.85 : 1) * c.open!,
      depth: heart ? 0.039 : arc ? Math.max(0.007, c.h! * 0.23) : 0.032,
      arc,
      heart,
      bend: (c.bend ?? 0) * 0.55,
      tilt: (-(c.tilt ?? 0) * Math.PI) / 180,
      pupil: c.pupil ?? 1,
      pupilHeart: c.heart ?? 0,
      pupilVisible: shape === 2 ? (c.pupilAlpha ?? 1) : 0,
      x: (side === 0 ? -1 : 1) * 0.42 + (expression === 9 ? 0.035 : 0),
      y: -0.015 + (expression === 2 && side === 1 ? 0.045 : 0),
    };
    for (const [key, v] of Object.entries(data)) out[`eye${side}.${key}`] = v;
  });
  out.focus = expression === 2 ? 0.16 : 0;
  for (const key of ["body", "face"]) {
    const hex = skin.colors[key]?.replace("#", "") ?? "000000";
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    for (let i = 0; i < 3; i++)
      out[`${key}${i}`] = parseInt(full.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}
function targetAt(state: SpatialTransition, time: number): Values {
  const values = { ...state.target };
  const motion = spatialMotion(
    state.action,
    Math.max(0, time - state.actionAt),
    values.elasticity ?? 1,
  );
  for (const [key, v] of Object.entries(motion)) values[`motion.${key}`] = v;
  return values;
}
const duration = 0.38;
export function transitionAt(state: SpatialTransition, time: number): Values {
  const values = targetAt(state, time),
    u = Math.max(0, Math.min(1, (time - state.at) / duration));
  const position = 1 - 3 * u * u + 2 * u * u * u,
    velocity = (u - 2 * u * u + u * u * u) * duration;
  for (const key of Object.keys(values))
    values[key]! +=
      (state.offset[key] ?? 0) * position +
      (state.velocity[key] ?? 0) * velocity;
  return values;
}
export function prepareTransition(skin: RigBinding): SpatialTransition {
  return {
    target: appearance(skin),
    action: Math.round(skin.parameters.state ?? 0),
    actionAt: 0,
    at: 0,
    offset: {},
    velocity: {},
  };
}
export function updateTransition(
  previous: SpatialTransition,
  skin: RigBinding,
  time: number,
): SpatialTransition {
  const target = appearance(skin),
    action = Math.round(skin.parameters.state ?? 0);
  if (
    JSON.stringify(target) === JSON.stringify(previous.target) &&
    action === previous.action
  )
    return previous;
  const next: SpatialTransition = {
    target,
    action,
    actionAt: action === previous.action ? previous.actionAt : time,
    at: time,
    offset: {},
    velocity: {},
  };
  const from = transitionAt(previous, time),
    to = targetAt(next, time),
    dt = 0.0001;
  const oldBefore = transitionAt(previous, Math.max(0, time - dt)),
    oldAfter = transitionAt(previous, time + dt);
  const newAfter = targetAt(next, time + dt);
  for (const key of Object.keys(to)) {
    let delta = (from[key] ?? to[key]!) - to[key]!;
    if (
      [
        "yaw",
        "pitch",
        "roll",
        "motion.yaw",
        "motion.pitch",
        "motion.roll",
      ].includes(key)
    )
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    next.offset[key] = delta;
    next.velocity[key] =
      ((oldAfter[key] ?? 0) - (oldBefore[key] ?? 0)) /
        (time < dt ? dt : 2 * dt) -
      ((newAfter[key] ?? 0) - (to[key] ?? 0)) / dt;
  }
  return next;
}
export function transitionColor(values: Values, key: string): string {
  return (
    "#" +
    [0, 1, 2]
      .map((i) =>
        Math.round(Math.max(0, Math.min(255, values[`${key}${i}`]!)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
