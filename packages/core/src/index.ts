export {defineResourcePack,collectResourcePacks,type ResourcePack} from './resource-pack.js';
export type {SceneValue,SceneChannels} from './scene-values.js';
export type {AttachmentSolid,AttachmentFace} from './attachment-solids.js';
export {defineAttachment,renderAttachmentScene,attachmentSceneBuilder,type AttachmentDefinition,type AttachmentScene,type AttachmentNode,type AttachmentPoint,type AttachmentMotion,type AttachmentMesh,type AttachmentGeometry,type AttachmentSceneInput} from './attachment-scene.js';
export {PetRegistry,type PetConfig} from "./pet-config.js";
export {headMounts,headMountCapabilities,type HeadMountInput} from "./mount-space.js";
export {composeAttachments,contourMounts,type MountFrame,type MountFrames,type Attachment,type AttachmentInstance,type VolumeMount,type AttachmentContext} from "./attachments.js";
import type { SvgResource } from "./resources.js";
export type { SvgResource } from "./resources.js";
import type { Affine2D } from "./bindings.js";
export {
  bindPlane,
  bindEllipsoid,
  compose2D,
  transformPoint,
  solveJointChain,
  identity2D,
  type Affine2D,
  type Vec3,
  type SurfaceBinding,
  type SurfacePose,
  type Joint,
  type JointPose,
} from "./bindings.js";
import { blendFrames } from "./transition.js";
import { sampleBehavior, validateBehavior, type Behavior } from "./behavior.js";
export { RigRegistry } from "./registry.js";
export {
  validateBehavior,
  sampleBehavior,
  greeting,
  celebration,
  type Behavior,
  type Keyframe,
} from "./behavior.js";
export { blendFrames } from "./transition.js";
/** Pure, framework- and DOM-independent protocol. Coordinates use a 320 × 320 canvas. */
export const protocolVersion = 1 as const;
export type Point = { x: number; y: number };
export type Activity = "idle" | "working" | "waiting" | "success";
export type Mood = "calm" | "curious" | "happy";
export interface SurfaceMark {
  id: string;
  slot: string;
  color: string;
  opacity: number;
  points: Point[];
}
export interface Skin {
  design?: unknown;
  version: 1;
  id: string;
  name: string;
  rig: string;
  colors: Record<string, string>;
  /** Default geometry chosen by this skin. Runtime pose is never stored here. */
  variants?: Record<string, string>;
  markings?: SurfaceMark[];
  rigConfig?: RigConfig;
}
/** Validated geometry values, independent of appearance and playback. */
export type RigConfig = Record<string, number>;
export type RigPose = Record<string, number>;
/** Resolved input for rig adapters; never a serializable skin. */
export interface RigBinding extends Skin {
  parameters: Record<string, number>;
}
export interface Character {
  skin: Skin;
  rigConfig: RigConfig;
  pose: RigPose;
}
export interface PetState {
  attention: number;
  activity: Activity;
  mood: Mood;
  look: Point;
  drag: Point;
  pressed: boolean;
  reactionAt: number;
}
export interface Shape {
  mask?: string;
  paint?: { fill?: string; stroke?: string };
  /** Typed local-to-scene transform. Raw SVG transform strings are not accepted. */
  transform?: Affine2D;
  id: string;
  kind: "path" | "ellipse" | "rect" | "line";
  attrs: Record<string, string | number>;
}
export interface Frame {
  mounts?: import("./attachments.js").MountFrames;
  slots?: Record<string,number>;
  resources?: SvgResource[];
  viewBox?: { x: number; y: number; width: number; height: number };
  shapes: Shape[];
  anchors: Point[];
  bounds: { x: number; y: number; width: number; height: number };
}
export interface Rig {
  validateDesign?(value:unknown):unknown;
  mounts?: Record<string,{kind:"frame";version:1}>;
  id: string;
  version: 1;
  name: string;
  parameters: Record<string, { min: number; max: number; default: number }>;
  colors: Record<string, string>;
  /** Expensive initial binding belongs here, never in sample. */
  variants?: Record<string, readonly string[]>;
  surfaces?: Record<string, { description: string }>;
  poseParameters?: Rig["parameters"];
  prepare?(skin: RigBinding): unknown;
  /** Resolved appearance/config/pose update. Return fresh state; do not mutate the previous binding. */
  updateSkin?(input: {
    skin: RigBinding;
    previousSkin: RigBinding;
    prepared: unknown;
    time: number;
    skinTime: number;
    restart: boolean;
  }): { prepared: unknown; transition: "rig" | "frame" };
  channels?: Record<string, { min: number; max: number; default: number }>;
  sample(input: {
    time: number;
    /** Elapsed time since the latest accepted skin; useful for rig-local sequences. */
    skinTime: number;
    state: Readonly<PetState>;
    skin: RigBinding;
    reducedMotion: boolean;
    motion: Readonly<Record<string, number>>;
    prepared?: unknown;
  }): Frame;
}
export const clamp = (v: number, min = -1, max = 1) =>
  Math.max(min, Math.min(max, v));
export function validateSkin(value: unknown, rig: Rig): Skin {
  const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (!obj(value)) throw new Error("Skin must be an object");
  const allowed = [
    "version",
    "id",
    "name",
    "rig",
    "colors",
    "rigConfig",
    "markings",
    "variants",
    "design",
  ];
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    throw new Error("Unknown skin field");
  if (value.version !== 1 || value.rig !== rig.id)
    throw new Error("Incompatible skin version or rig");
  if (
    typeof value.id !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value.id)
  )
    throw new Error("Invalid skin id");
  if (
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 80
  )
    throw new Error("Invalid skin name");
  if (!obj(value.colors)) throw new Error("Colors must be an object");
  const colors: Record<string, string> = {};
  for (const key of Object.keys(value.colors))
    if (!Object.hasOwn(rig.colors, key))
      throw new Error(`Unknown color: ${key}`);
  for (const [key, fallback] of Object.entries(rig.colors)) {
    const color = Object.hasOwn(value.colors, key)
      ? value.colors[key]
      : fallback;
    if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))
      throw new Error(`Invalid color: ${key}`);
    colors[key] = color;
  }
  return {
    ...(value.design!==undefined?{design:rig.validateDesign?rig.validateDesign(value.design):(()=>{throw new Error("Rig does not support design data")})()}:{}),
    version: 1,
    id: value.id,
    name: value.name,
    rig: rig.id,
    colors,
    ...(value.variants !== undefined
      ? { variants: validateVariants(value.variants, rig) }
      : {}),
    rigConfig: validateRigConfig(value.rigConfig ?? {}, rig),
    ...(value.markings !== undefined
      ? { markings: validateMarkings(value.markings, rig) }
      : {}),
  };
}
/** Surface-local polygon data only: rigs own projection, masks and state visibility. */
export function validateVariants(
  value: unknown,
  rig: Rig,
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid appearance variants");
  for (const [key, v] of Object.entries(value))
    if (
      !Object.hasOwn(rig.variants ?? {}, key) ||
      typeof v !== "string" ||
      !rig.variants![key]!.includes(v)
    )
      throw new Error("Unsupported appearance variant");
  return structuredClone(value) as Record<string, string>;
}
export function validateMarkings(value: unknown, rig: Rig): SurfaceMark[] {
  if (!Array.isArray(value) || value.length > 8)
    throw new Error("At most 8 surface markings");
  const ids = new Set<string>();
  return value.map((mark) => {
    if (
      !mark ||
      typeof mark !== "object" ||
      Object.keys(mark).some(
        (k) => !["id", "slot", "color", "opacity", "points"].includes(k),
      )
    )
      throw new Error("Invalid marking");
    if (
      typeof mark.id !== "string" ||
      !/^[a-z0-9-]{1,32}$/.test(mark.id) ||
      ids.has(mark.id)
    )
      throw new Error("Invalid marking id");
    ids.add(mark.id);
    if (!Object.hasOwn(rig.surfaces ?? {}, mark.slot))
      throw new Error("Unsupported surface slot");
    if (typeof mark.color !== "string" || !/^#[a-f0-9]{6}$/i.test(mark.color))
      throw new Error("Invalid marking color");
    if (
      typeof mark.opacity !== "number" ||
      !Number.isFinite(mark.opacity) ||
      mark.opacity < 0 ||
      mark.opacity > 1
    )
      throw new Error("Invalid marking opacity");
    if (!Array.isArray(mark.points) || mark.points.length !== 32)
      throw new Error("Marking needs 32 corresponding boundary points");
    for (const p of mark.points)
      if (
        !p ||
        Object.keys(p).some((k) => k !== "x" && k !== "y") ||
        ![p.x, p.y].every(
          (v) =>
            typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1,
        )
      )
        throw new Error("Marking points must be in the local unit square");
    return structuredClone(mark) as SurfaceMark;
  });
}
export function validateValues(
  value: unknown,
  rules: Rig["parameters"],
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Configuration must be an object");
  const data = value as Record<string, unknown>;
  for (const key of Object.keys(data))
    if (!Object.hasOwn(rules, key))
      throw new Error(`Unknown parameter: ${key}`);
  return Object.fromEntries(
    Object.entries(rules).map(([key, rule]) => {
      const v = Object.hasOwn(data, key) ? data[key] : rule.default;
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v < rule.min ||
        v > rule.max
      )
        throw new Error(`Invalid parameter: ${key}`);
      return [key, v];
    }),
  );
}
export const validateRigConfig = (value: unknown, rig: Rig): RigConfig =>
  validateValues(value, rig.parameters);
export const validateRigPose = (value: unknown, rig: Rig): RigPose =>
  validateValues(value, rig.poseParameters ?? {});
export type PetEvent =
  | { type: "activity"; value: Activity }
  | { type: "mood"; value: Mood }
  | { type: "look" | "drag"; value: Point }
  | { type: "press"; value: boolean }
  | { type: "tap" }
  | { type: "hover"; value: boolean };
export interface EngineOptions {
  transitionDuration?: number;
  rigConfig?: RigConfig;
  pose?: RigPose;
}
export class PetEngine {
  private attention = { from: 0, target: 0, at: 0 };
  private attentionAt(time: number) {
    const u = clamp((time - this.attention.at) / 0.24, 0, 1);
    return (
      this.attention.from +
      (this.attention.target - this.attention.from) * (1 - (1 - u) ** 3)
    );
  }
  private focus(value: boolean, time: number) {
    const target = Number(value);
    if (target !== this.attention.target)
      this.attention = { from: this.attentionAt(time), target, at: time };
  }
  private transition: { from: Frame; at: number } | null = null;
  private lastEventTime = 0;
  private gaze = { from: { x: 0, y: 0 }, at: -1 };
  private lookAt(time: number) {
    const u = clamp((time - this.gaze.at) / 0.14, 0, 1),
      k = 1 - (1 - u) ** 3;
    return {
      x: this.gaze.from.x + (this.state.look.x - this.gaze.from.x) * k,
      y: this.gaze.from.y + (this.state.look.y - this.gaze.from.y) * k,
    };
  }
  private duration: number;
  private action: { clip: Behavior; at: number } | null = null;
  private assertTime(time: number) {
    if (!Number.isFinite(time) || time < 0)
      throw new Error("Time must be finite and non-negative");
    if (time < this.lastEventTime)
      throw new Error("Events must use monotonic timestamps");
  }
  private begin(time: number) {
    this.assertTime(time);
    this.transition = { from: this.sample(time), at: time };
    this.lastEventTime = time;
  }
  play(value: unknown, time: number): boolean {
    this.assertTime(time);
    const clip = validateBehavior(value, this.rig);
    if (this.state.pressed) return false;
    if (
      this.action &&
      time < this.action.at + this.action.clip.duration &&
      clip.priority < this.action.clip.priority
    )
      return false;
    this.begin(time);
    this.action = { clip, at: time };
    return true;
  }
  stop(time: number) {
    this.begin(time);
    this.action = null;
  }
  private state: PetState = {
    attention: 0,
    activity: "idle",
    mood: "calm",
    look: { x: 0, y: 0 },
    drag: { x: 0, y: 0 },
    pressed: false,
    reactionAt: -100,
  };
  private skin: RigBinding;
  private rigConfig: RigConfig;
  private pose: RigPose;
  private prepared: unknown;
  private skinAt = 0;
  constructor(
    readonly rig: Rig,
    skin: unknown,
    options: EngineOptions = {},
  ) {
    this.duration = options.transitionDuration ?? 0.22;
    if (
      !Number.isFinite(this.duration) ||
      this.duration < 0 ||
      this.duration > 2
    )
      throw new Error("Transition duration must be 0–2 seconds");
    const validSkin = validateSkin(skin, rig);
    this.rigConfig = validateRigConfig(
      { ...validSkin.rigConfig, ...options.rigConfig },
      rig,
    );
    this.pose = validateRigPose(options.pose ?? {}, rig);
    this.skin = {
      ...validSkin,
      parameters: { ...this.rigConfig, ...this.pose },
    };
    this.prepared = rig.prepare?.(structuredClone(this.skin));
  }
  setSkin(
    skin: unknown,
    time = this.lastEventTime,
    options: { restart?: boolean } = {},
  ) {
    const next = validateSkin(skin, this.rig);
    this.apply(next, next.rigConfig ?? {}, this.pose, time, {
      restart: false,
      ...options,
    });
  }
  private apply(
    skin: unknown,
    config: RigConfig,
    pose: RigPose,
    time: number,
    options: { restart?: boolean },
  ) {
    this.assertTime(time);
    const rigConfig = validateRigConfig(config, this.rig);
    const runtime = validateRigPose(pose, this.rig);
    const next: RigBinding = {
      ...validateSkin(skin, this.rig),
      parameters: { ...rigConfig, ...runtime },
    };
    const update = this.rig.updateSkin?.({
      skin: structuredClone(next),
      previousSkin: structuredClone(this.skin),
      prepared: this.prepared,
      time,
      skinTime: Math.max(0, time - this.skinAt),
      restart: options.restart !== false,
    });
    const prepared = update
      ? update.prepared
      : this.rig.prepare?.(structuredClone(next));
    if (update?.transition === "rig") {
      this.transition = null;
      this.lastEventTime = time;
    } else this.begin(time);
    this.prepared = prepared;
    if (options.restart !== false) this.skinAt = time;
    this.skin = next;
    this.rigConfig = rigConfig;
    this.pose = runtime;
  }
  getSkin(): Skin {
    const { parameters, ...skin } = this.skin;
    return structuredClone(skin);
  }
  /** Save current appearance and adjusted geometry as reusable skin data, without pose. */
  exportSkin(): Skin {
    return { ...this.getSkin(), rigConfig: this.getRigConfig() };
  }
  getRigConfig(): RigConfig {
    return structuredClone(this.rigConfig);
  }
  getPose(): RigPose {
    return structuredClone(this.pose);
  }
  getCharacter(): Character {
    return {
      skin: this.getSkin(),
      rigConfig: this.getRigConfig(),
      pose: this.getPose(),
    };
  }
  setRigConfig(value: RigConfig, time = this.lastEventTime) {
    this.apply(this.getSkin(), value, this.pose, time, { restart: false });
  }
  setPose(value: RigPose, time = this.lastEventTime) {
    this.apply(this.getSkin(), this.rigConfig, value, time, { restart: true });
  }
  setCharacter(
    value: Character,
    time = this.lastEventTime,
    options: { restart?: boolean } = {},
  ) {
    this.apply(value.skin, value.rigConfig, value.pose, time, options);
  }
  handle(event: PetEvent, time: number) {
    this.assertTime(time);
    if (event.type === "look" || event.type === "drag") {
      if (!Number.isFinite(event.value.x) || !Number.isFinite(event.value.y))
        return;
      if (event.type === "look") {
        this.focus(true, time);
        this.gaze = { from: this.lookAt(time), at: time };
      }
      this.state[event.type] = {
        x: clamp(event.value.x),
        y: clamp(event.value.y),
      };
    } else if (event.type === "hover") this.focus(event.value, time);
    else if (event.type === "tap") this.state.reactionAt = time;
    else if (event.type === "activity") {
      if (!["idle", "working", "waiting", "success"].includes(event.value))
        throw new Error("Invalid activity");
      if (this.state.activity === event.value) return;
      this.begin(time);
      this.state.activity = event.value;
      this.state.reactionAt = time;
    } else if (event.type === "mood") {
      if (!["calm", "curious", "happy"].includes(event.value))
        throw new Error("Invalid mood");
      if (this.state.mood === event.value) return;
      this.begin(time);
      this.state.mood = event.value;
    } else if (event.type === "press") {
      if (this.state.pressed === event.value) return;
      this.begin(time);
      this.state.pressed = event.value;
      if (event.value) this.action = null;
    }
    this.lastEventTime = time;
  }
  sample(time: number, reducedMotion = false): Frame {
    if (!Number.isFinite(time) || time < 0)
      throw new Error("Time must be finite and non-negative");
    const motion: Record<string, number> = Object.fromEntries(
      Object.entries(this.rig.channels ?? {}).map(([k, r]) => [k, r.default]),
    );
    if (!reducedMotion && this.action && time >= this.action.at)
      Object.assign(
        motion,
        sampleBehavior(this.action.clip, time - this.action.at),
      );
    const frame = this.rig.sample({
      time,
      skinTime: Math.max(0, time - this.skinAt),
      state: {
        ...structuredClone(this.state),
        attention: reducedMotion
          ? this.attention.target
          : this.attentionAt(time),
        look: reducedMotion ? this.state.look : this.lookAt(time),
      },
      skin: structuredClone(this.skin),
      reducedMotion,
      motion,
      prepared: this.prepared,
    });
    if (!reducedMotion && this.transition && this.duration > 0) {
      const u = clamp((time - this.transition.at) / this.duration, 0, 1);
      return blendFrames(this.transition.from, frame, u * u * (3 - 2 * u));
    }
    return frame;
  }
}

/** A skin package may export this ready-to-use rig/skin pair. */
export interface PetDefinition {
  rig: Rig;
  skin: Skin;
  rigConfig?: RigConfig;
}
export interface SkinInput {
  design?: unknown;
  variants?: Record<string, string>;
  markings?: SurfaceMark[];
  id: string;
  name: string;
  colors?: Record<string, string>;
  rigConfig?: RigConfig;
}
/** Used by rig packages to bind skin data to their protocol and constraints. */
export function defineSkin(rig: Rig, input: SkinInput): Skin {
  const skin = validateSkin(
    {
      ...input,
      version: 1,
      rig: rig.id,
      colors: input.colors ?? {},
    },
    rig,
  );
  return skin;
}
export { PoseController } from "./pose.js";
