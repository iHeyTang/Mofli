export const spatialExpressions = [
  "默认",
  "平静",
  "专注",
  "惊讶",
  "兴奋",
  "开心",
  "大笑",
  "生气",
  "伤心",
  "害怕",
  "怀疑",
  "困惑",
  "好奇",
  "得意",
  "害羞",
  "无聊",
  "困倦",
  "不耐烦",
  "喜欢",
].map((name, index) => ({ index, name, duration: 3 }));
export const spatialShapes = [
  "Mallow",
  "Pip",
  "Pebble",
  "软枕",
  "水滴",
  "团子",
].map((name, index) => ({ index, name, duration: 3 }));
export const spatialActions = [
  ["breathe", "呼吸", 4],
  ["bounce", "蹦跳", 1.35],
  ["jelly", "果冻摇", 3],
  ["spin", "转圈", 3.6],
  ["nod", "点头", 2.4],
  ["shake", "摇头", 2.6],
  ["squish", "蓄力弹起", 1.8],
  ["float", "漂浮", 4],
].map(([id, name, duration], index) => ({
  index,
  id: String(id),
  name: String(name),
  duration: Number(duration),
  posterTime: Number(duration) * 0.28,
}));
/** Periodic, deterministic, volume-preserving motion. Ground contact stays at y=-.78. */
export function spatialMotion(action: number, time: number, energy = 1) {
  const duration = spatialActions[action]?.duration ?? 4,
    t = (time / duration) * Math.PI * 2;
  let y = 0,
    x = 0,
    stretch = 1,
    yaw = 0,
    pitch = 0,
    roll = 0,
    flex = 0;
  if (action === 0) stretch = 1 + Math.sin(t) * 0.025;
  if (action === 1 || action === 6) {
    const jump = jumpMotion(time, action === 6);
    y = jump.y;
    stretch = jump.stretch;
    roll = jump.roll;
    flex = jump.flex;
  }
  if (action === 2) {
    stretch = 1 + Math.sin(t * 2) * 0.13;
    roll = Math.sin(t) * 0.22;
    x = Math.sin(t) * 0.1;
    yaw = Math.sin(t + 0.5) * 0.18;
  }
  if (action === 3) {
    yaw = t;
    roll = Math.sin(t) * 0.12;
    stretch = 1 + Math.sin(t * 2) * 0.035;
  }
  if (action === 4) {
    pitch = Math.sin(t) * 0.32;
    stretch = 1 + Math.sin(t) * 0.035;
  }
  if (action === 5) {
    yaw = Math.sin(t) * 0.58;
    roll = Math.sin(t + 0.6) * 0.07;
  }
  if (action === 7) {
    y = 0.25 + Math.sin(t) * 0.16;
    roll = Math.sin(t) * 0.12;
    pitch = Math.cos(t) * 0.09;
    stretch = 1 + Math.sin(t + 0.5) * 0.025;
  }
  stretch = 1 + (stretch - 1) * energy;
  return {
    y: y * energy,
    x: x * energy,
    stretch,
    yaw: yaw * energy,
    pitch: pitch * energy,
    roll: roll * energy,
    width: 1 / Math.sqrt(stretch),
    flex: flex * energy,
  };
}

/** Ballistic flight under constant gravity, with contact compression between diminishing rebounds. */
export function jumpMotion(time: number, charged = false) {
  const duration = charged ? 1.8 : 1.35,
    phase = ((time % duration) + duration) % duration;
  const launch = charged ? 0.36 : 0.16,
    flight = charged ? 0.62 : 0.5,
    height = charged ? 0.74 : 0.48;
  const ease = (u: number) => {
    u = Math.max(0, Math.min(1, u));
    return u * u * (3 - 2 * u);
  };
  const blend = (a: number, b: number, u: number) => a + (b - a) * ease(u);
  if (phase < launch) {
    const peak = launch * 0.72,
      compression = charged ? 0.62 : 0.8;
    return {
      y: 0,
      stretch:
        phase < peak
          ? blend(1, compression, phase / peak)
          : blend(compression, 1.15, (phase - peak) / (launch - peak)),
      roll: 0,
      flex: 0,
    };
  }
  const landing = launch + flight;
  if (phase <= landing) {
    const u = (phase - launch) / flight;
    return {
      y: 4 * height * u * (1 - u),
      stretch: 1 + 0.15 * (2 * u - 1) ** 2,
      roll: Math.sin(u * Math.PI) * 0.06,
      flex: 0,
    };
  }
  const impacts: Array<{ at: number; scale: number }> = [
    { at: landing, scale: 1 },
  ];
  let start = landing + (charged ? 0.18 : 0.14),
    scale = 0.24,
    y = 0;
  for (let bounce = 0; bounce < 2; bounce++) {
    const length = flight * scale,
      end = start + length;
    if (phase >= start && phase <= end) {
      const u = (phase - start) / length;
      y = 4 * height * scale * scale * u * (1 - u);
    }
    impacts.push({ at: end, scale });
    start = end + (charged ? 0.09 : 0.07);
    scale *= 0.3;
  }
  // Landing energy is absorbed by a damped spring in the body, not an instant pose change.
  const age = phase - landing,
    fade = 1 - ease((phase - (duration - 0.16)) / 0.16);
  let stretch = 1 + 0.15 * Math.exp(-14 * age),
    flex = 0,
    roll = 0;
  for (const impact of impacts) {
    const t = phase - impact.at;
    if (t < 0) continue;
    const envelope = Math.exp(-4.5 * t) * impact.scale;
    stretch -= (charged ? 0.34 : 0.29) * envelope * Math.sin(17 * t);
    flex += 0.11 * envelope * Math.sin(19 * t);
    roll += 0.035 * envelope * Math.sin(15 * t);
  }
  return {
    y,
    stretch: 1 + (stretch - 1) * fade,
    flex: flex * fade,
    roll: roll * fade,
  };
}

/** A brief blink: quick closing, a short rest, then a gentler reopening. */
export function spatialBlink(time: number): number {
  const phase = (((time % 4.8) + 4.8) % 4.8) - 3.8;
  const smooth = (x: number) => x * x * (3 - 2 * x);
  if (phase < 0 || phase >= 0.27) return 0;
  if (phase < 0.085) return smooth(phase / 0.085);
  if (phase < 0.115) return 1;
  return 1 - smooth((phase - 0.115) / 0.155);
}
