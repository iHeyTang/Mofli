import type { Rig } from "./index.js";
export interface Keyframe {
  at: number;
  value: number;
}
/** Declarative, one-shot channel animation; times are seconds. */
export interface Behavior {
  version: 1;
  id: string;
  duration: number;
  priority: number;
  tracks: Record<string, Keyframe[]>;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateBehavior(value: unknown, rig: Rig): Behavior {
  if (
    !record(value) ||
    Object.keys(value).some(
      (k) => !["version", "id", "duration", "priority", "tracks"].includes(k),
    )
  )
    throw new Error("Invalid behavior fields");
  if (
    value.version !== 1 ||
    typeof value.id !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value.id)
  )
    throw new Error("Invalid behavior identity");
  if (
    typeof value.duration !== "number" ||
    !Number.isFinite(value.duration) ||
    value.duration <= 0 ||
    value.duration > 30
  )
    throw new Error("Behavior duration must be 0–30 seconds");
  if (
    typeof value.priority !== "number" ||
    !Number.isInteger(value.priority) ||
    value.priority < 0 ||
    value.priority > 100
  )
    throw new Error("Behavior priority must be 0–100");
  if (!record(value.tracks) || !Object.keys(value.tracks).length)
    throw new Error("Behavior needs tracks");
  const tracks: Record<string, Keyframe[]> = {};
  for (const [key, frames] of Object.entries(value.tracks)) {
    const rule = rig.channels?.[key];
    if (!rule) throw new Error(`Unsupported motion channel: ${key}`);
    if (!Array.isArray(frames) || frames.length < 2 || frames.length > 128)
      throw new Error("A track needs 2–128 keyframes");
    let last = -1;
    tracks[key] = frames.map((f) => {
      if (
        !record(f) ||
        Object.keys(f).some((k) => !["at", "value"].includes(k)) ||
        typeof f.at !== "number" ||
        !Number.isFinite(f.at) ||
        f.at <= last ||
        f.at < 0 ||
        f.at > Number(value.duration) ||
        typeof f.value !== "number" ||
        !Number.isFinite(f.value) ||
        f.value < rule.min ||
        f.value > rule.max
      )
        throw new Error(`Invalid keyframe: ${key}`);
      last = f.at;
      return { at: f.at, value: f.value };
    });
    const first = tracks[key]![0]!,
      end = tracks[key]!.at(-1)!;
    if (
      first.at !== 0 ||
      end.at !== value.duration ||
      first.value !== rule.default ||
      end.value !== rule.default
    )
      throw new Error(`Track ${key} must start and end at its neutral value`);
  }
  return {
    version: 1,
    id: value.id,
    duration: value.duration,
    priority: value.priority,
    tracks,
  };
}
export function sampleBehavior(
  behavior: Behavior,
  elapsed: number,
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const [key, frames] of Object.entries(behavior.tracks)) {
    const index = frames.findIndex((f) => f.at >= elapsed);
    if (index <= 0) {
      values[key] = (index === 0 ? frames[0] : frames.at(-1))!.value;
      continue;
    }
    const a = frames[index - 1]!,
      b = frames[index]!;
    const u = (elapsed - a.at) / (b.at - a.at),
      ease = u * u * (3 - 2 * u);
    values[key] = a.value + (b.value - a.value) * ease;
  }
  return values;
}
export const greeting: Behavior = {
  version: 1,
  id: "greeting",
  duration: 0.9,
  priority: 20,
  tracks: {
    lift: [
      { at: 0, value: 0 },
      { at: 0.3, value: 22 },
      { at: 0.6, value: 5 },
      { at: 0.9, value: 0 },
    ],
  },
};
export const celebration: Behavior = {
  version: 1,
  id: "celebration",
  duration: 1.2,
  priority: 40,
  tracks: {
    lift: [
      { at: 0, value: 0 },
      { at: 0.25, value: 32 },
      { at: 0.55, value: 0 },
      { at: 0.85, value: 20 },
      { at: 1.2, value: 0 },
    ],
  },
};
