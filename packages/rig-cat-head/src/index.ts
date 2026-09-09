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
  "静候",
  "思考",
  "眨眼",
  "惊讶",
  "警觉",
  "通知",
  "感叹",
  "休眠",
  "蛋形",
  "六边形",
  "跃动",
  "环绕",
  "爆散",
  "彗星",
];
const descriptions = [
  "软团母版：宽圆脸、短耳，正面自然眨眼。",
  "化成思考点，耳朵收进轮廓。",
  "单眼眨动，左右耳错落。",
  "沿用 Bloub 的惊讶五官，双耳竖起。",
  "化为倾斜感叹号，耳朵收拢。",
  "提示点弹出，右耳压低为提示让位。",
  "身体收成感叹号，耳朵折入。",
  "缩成休眠小点，耳朵随身体收起。",
  "蛋形拉长，耳根随轮廓收窄。",
  "六边形展开，双耳低伏。",
  "三角形跃动，双耳外展。",
  "轨道穿行，耳朵贴近旋转轮廓。",
  "身体爆散，耳朵先收拢再随身体回归。",
  "彗星尾迹流动，双耳向外低伏。",
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
export const catHeadRig: Rig = {
  id: "cat-head",
  version: 1,
  name: "Cat head",
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
          },
    );
    const effective = reducedMotion ? skin : appearance(p, t);
    const elapsed = time - state.reactionAt;
    const clicked = !reducedMotion && elapsed >= 0 && elapsed < .68 ? Math.min(1, elapsed/.07, (.68-elapsed)/.16) : 0;
    const irritated = Math.max(skin.parameters.expression === 16 ? 1 : 0, clicked) * source.attachmentSurface.visibility;
    const frame = characterFrame(
      source,
      effective.colors.body!,
      effective.colors.face!,
      effective.variants?.eyes,
      irritated,
      reducedMotion || irritated === 0 ? 0 : Math.exp(-7 * (clicked > 0 ? elapsed : skinTime)) * Math.sin(24 * (clicked > 0 ? elapsed : skinTime)),
    );
    const bodyIndex = frame.shapes.findIndex((s) => s.id === "ink-body");
    frame.shapes.splice(
      bodyIndex + 1,
      0,
      ...renderMarkings(source, effective.markings),
    );
    frame.anchors = [
      source.attachmentPoints[40]!,
      source.attachmentPoints[56]!,
    ];
    return frame;
  },
};
export const defineCatSkin = (input: SkinInput) =>
  defineSkin(catHeadRig, input);
