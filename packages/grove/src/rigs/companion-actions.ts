/** Original Mofli choreography, shared semantic scores with rig-specific geometry binding.
 * Pure bounded periodic sampling: seconds in, normalized body/head channels out. */
export const companionActions = [
  { id: "soft-breath", name: "轻轻呼吸", scene: "idle", duration: 5, x: 0, lift: 0, stretch: 0.035, yaw: 0.04, pitch: 0.03, roll: 0.03, expression: 0 },
  { id: "curious-tilt", name: "侧头好奇", scene: "idle", duration: 3.8, x: 0.02, lift: 0, stretch: 0.02, yaw: 0.15, pitch: 0.1, roll: 0.22, expression: 11 },
  { id: "look-around", name: "环顾四周", scene: "idle", duration: 5, x: 0.05, lift: 0, stretch: 0.02, yaw: 0.48, pitch: 0.08, roll: 0.06, expression: 11 },
  { id: "sleepy-sway", name: "困倦摇晃", scene: "idle", duration: 6, x: 0.03, lift: 0, stretch: -0.06, yaw: 0.04, pitch: 0.2, roll: 0.13, expression: 15 },
  { id: "boot-pulse", name: "启动脉冲", scene: "loading", duration: 1.5, x: 0, lift: 0.09, stretch: 0.17, yaw: 0.08, pitch: 0.08, roll: 0.08, expression: 2 },
  { id: "radar-scan", name: "雷达扫描", scene: "loading", duration: 2.6, x: 0.08, lift: 0.03, stretch: 0.04, yaw: 0.65, pitch: 0.12, roll: 0.08, expression: 1 },
  { id: "orbit-warmup", name: "绕圈热身", scene: "loading", duration: 2.2, x: 0.16, lift: 0.15, stretch: 0.08, yaw: 0.3, pitch: 0.15, roll: 0.2, expression: 11 },
  { id: "rise-awake", name: "舒展苏醒", scene: "loading", duration: 3, x: 0, lift: 0.2, stretch: 0.2, yaw: 0.08, pitch: 0.3, roll: 0.05, expression: 2 },
  { id: "key-tap", name: "敲敲键盘", scene: "typing", duration: 1.6, x: 0.04, lift: 0.03, stretch: 0.05, yaw: 0.12, pitch: 0.18, roll: 0.09, expression: 1 },
  { id: "lean-listen", name: "前倾聆听", scene: "typing", duration: 3.2, x: 0, lift: 0.02, stretch: 0.04, yaw: 0.04, pitch: 0.32, roll: 0.06, expression: 11 },
  { id: "follow-line", name: "追着文字", scene: "typing", duration: 2.8, x: 0.12, lift: 0, stretch: 0.03, yaw: 0.36, pitch: 0.08, roll: 0.03, expression: 1 },
  { id: "eager-rock", name: "期待晃动", scene: "typing", duration: 2, x: 0.07, lift: 0.08, stretch: 0.08, yaw: 0.16, pitch: 0.08, roll: 0.15, expression: 4 },
  { id: "ponder-tilt", name: "歪头推敲", scene: "thinking", duration: 4, x: 0.03, lift: 0, stretch: 0.025, yaw: 0.2, pitch: 0.15, roll: 0.3, expression: 9 },
  { id: "weigh-options", name: "左右权衡", scene: "thinking", duration: 3.6, x: 0.12, lift: 0.02, stretch: 0.05, yaw: 0.4, pitch: 0.06, roll: 0.16, expression: 10 },
  { id: "idea-rise", name: "灵感浮起", scene: "thinking", duration: 3.3, x: 0, lift: 0.22, stretch: 0.1, yaw: 0.1, pitch: -0.25, roll: 0.1, expression: 2 },
  { id: "focus-pulse", name: "专注脉动", scene: "thinking", duration: 2.7, x: 0, lift: 0.04, stretch: 0.07, yaw: 0.03, pitch: 0.15, roll: 0.02, expression: 1 },
  { id: "talk-nod", name: "说话点头", scene: "responding", duration: 1.8, x: 0.02, lift: 0.04, stretch: 0.055, yaw: 0.08, pitch: 0.22, roll: 0.06, expression: 4 },
  { id: "explain-sway", name: "娓娓道来", scene: "responding", duration: 3, x: 0.09, lift: 0.04, stretch: 0.04, yaw: 0.25, pitch: 0.1, roll: 0.17, expression: 1 },
  { id: "confident-bob", name: "自信轻跃", scene: "responding", duration: 2.2, x: 0, lift: 0.16, stretch: 0.09, yaw: 0.12, pitch: 0.12, roll: 0.1, expression: 12 },
  { id: "present-bow", name: "呈上答案", scene: "responding", duration: 3.5, x: 0, lift: 0.03, stretch: -0.1, yaw: 0.04, pitch: 0.38, roll: 0.04, expression: 4 },
  { id: "work-pump", name: "用力干活", scene: "tooling", duration: 1.4, x: 0.025, lift: 0.1, stretch: 0.16, yaw: 0.06, pitch: 0.18, roll: 0.04, expression: 1 },
  { id: "inspect-sweep", name: "来回检查", scene: "tooling", duration: 2.4, x: 0.14, lift: 0.03, stretch: 0.03, yaw: 0.5, pitch: 0.16, roll: 0.05, expression: 9 },
  { id: "turn-crank", name: "转动摇柄", scene: "tooling", duration: 1.9, x: 0.12, lift: 0.12, stretch: 0.12, yaw: 0.23, pitch: 0.2, roll: 0.23, expression: 1 },
  { id: "carry-step", name: "搬运小步", scene: "tooling", duration: 1.7, x: 0.13, lift: 0.09, stretch: 0.1, yaw: 0.15, pitch: 0.09, roll: 0.12, expression: 1 },
  { id: "attention-bob", name: "招呼一下", scene: "waiting", duration: 2.5, x: 0, lift: 0.2, stretch: 0.12, yaw: 0.1, pitch: 0.08, roll: 0.18, expression: 11 },
  { id: "patient-tilt", name: "耐心等候", scene: "waiting", duration: 4, x: 0.025, lift: 0, stretch: 0.025, yaw: 0.12, pitch: 0.06, roll: 0.25, expression: 11 },
  { id: "question-peek", name: "探头询问", scene: "waiting", duration: 3, x: 0.13, lift: 0.08, stretch: 0.07, yaw: 0.35, pitch: -0.18, roll: 0.15, expression: 10 },
  { id: "gentle-nudge", name: "轻轻提醒", scene: "waiting", duration: 2.8, x: 0.18, lift: 0.025, stretch: 0.05, yaw: 0.18, pitch: 0.12, roll: 0.09, expression: 2 },
  { id: "victory-hop", name: "胜利一跳", scene: "completed", duration: 1.6, x: 0.03, lift: 0.42, stretch: 0.18, yaw: 0.15, pitch: -0.1, roll: 0.18, expression: 3 },
  { id: "happy-dance", name: "开心舞步", scene: "completed", duration: 2.6, x: 0.2, lift: 0.18, stretch: 0.14, yaw: 0.32, pitch: 0.1, roll: 0.3, expression: 4 },
  { id: "proud-bow", name: "得意鞠躬", scene: "completed", duration: 3, x: 0, lift: 0.04, stretch: -0.12, yaw: 0.12, pitch: 0.42, roll: 0.06, expression: 12 },
  { id: "joy-twirl", name: "喜悦旋舞", scene: "completed", duration: 2.4, x: 0.08, lift: 0.24, stretch: 0.08, yaw: 0.7, pitch: 0.1, roll: 0.38, expression: 5 },
  { id: "startled-recoil", name: "受惊后退", scene: "failed", duration: 1.8, x: -0.14, lift: 0.06, stretch: -0.12, yaw: 0.2, pitch: -0.35, roll: 0.16, expression: 2 },
  { id: "sorry-bow", name: "抱歉低头", scene: "failed", duration: 4, x: 0, lift: 0, stretch: -0.13, yaw: 0.06, pitch: 0.4, roll: 0.08, expression: 7 },
  { id: "puzzled-shake", name: "困惑摇头", scene: "failed", duration: 2.4, x: 0.04, lift: 0, stretch: 0.035, yaw: 0.5, pitch: 0.14, roll: 0.14, expression: 10 },
  { id: "recover-breath", name: "振作呼吸", scene: "failed", duration: 3.5, x: 0, lift: 0.07, stretch: 0.14, yaw: 0.08, pitch: 0.18, roll: 0.05, expression: 1 },
  { id: "brake-rock", name: "停下缓冲", scene: "interrupted", duration: 2, x: 0.12, lift: 0, stretch: -0.1, yaw: 0.1, pitch: 0.22, roll: 0.24, expression: 2 },
  { id: "settle-down", name: "慢慢坐稳", scene: "interrupted", duration: 3.8, x: 0, lift: 0.02, stretch: -0.12, yaw: 0.05, pitch: 0.14, roll: 0.08, expression: 0 },
  { id: "pause-glance", name: "暂停回望", scene: "interrupted", duration: 3, x: 0.03, lift: 0, stretch: 0.025, yaw: -0.4, pitch: 0.05, roll: 0.13, expression: 9 },
  { id: "ready-again", name: "重新准备", scene: "interrupted", duration: 2.6, x: 0, lift: 0.12, stretch: 0.12, yaw: 0.16, pitch: 0.18, roll: 0.06, expression: 1 },
  { id: "jelly-wobble", name: "果冻抖抖", scene: "playful", duration: 1.9, x: 0.08, lift: 0.05, stretch: 0.22, yaw: 0.18, pitch: 0.12, roll: 0.32, expression: 4 },
  { id: "tiptoe-peek", name: "踮脚偷看", scene: "playful", duration: 3.1, x: 0.12, lift: 0.2, stretch: 0.12, yaw: 0.4, pitch: -0.2, roll: 0.14, expression: 11 },
  { id: "figure-eight", name: "八字摇摆", scene: "playful", duration: 3.7, x: 0.22, lift: 0.14, stretch: 0.07, yaw: 0.35, pitch: 0.18, roll: 0.28, expression: 4 },
  { id: "tiny-somersault", name: "小小翻滚", scene: "playful", duration: 2.8, x: 0.14, lift: 0.17, stretch: 0.15, yaw: 0.55, pitch: 0.48, roll: 0.5, expression: 3 },
  { id: "hello-wave", name: "摇头招手", scene: "affection", duration: 2.7, x: 0.1, lift: 0.13, stretch: 0.07, yaw: 0.4, pitch: 0.05, roll: 0.23, expression: 4 },
  { id: "shy-tuck", name: "害羞缩缩", scene: "affection", duration: 4, x: 0.04, lift: 0, stretch: -0.16, yaw: -0.23, pitch: 0.3, roll: 0.2, expression: 13 },
  { id: "cuddle-lean", name: "贴贴依偎", scene: "affection", duration: 4.5, x: 0.16, lift: 0.02, stretch: 0.08, yaw: 0.16, pitch: 0.14, roll: 0.26, expression: 4 },
  { id: "thank-you", name: "谢谢点头", scene: "affection", duration: 3.2, x: 0, lift: 0.06, stretch: 0.04, yaw: 0.05, pitch: 0.3, roll: 0.06, expression: 4 },
  { id: "long-stretch", name: "伸个懒腰", scene: "rest", duration: 5.2, x: 0, lift: 0.08, stretch: 0.25, yaw: 0.08, pitch: -0.3, roll: 0.12, expression: 15 },
  { id: "doze-nod", name: "打个瞌睡", scene: "rest", duration: 5.8, x: 0.02, lift: 0, stretch: -0.06, yaw: 0.03, pitch: 0.32, roll: 0.07, expression: 15 },
  { id: "dream-float", name: "梦中漂浮", scene: "rest", duration: 6, x: 0.12, lift: 0.26, stretch: 0.045, yaw: 0.18, pitch: 0.12, roll: 0.2, expression: 15 },
  { id: "wake-shake", name: "抖抖醒来", scene: "rest", duration: 2, x: 0.07, lift: 0.08, stretch: 0.13, yaw: 0.42, pitch: 0.08, roll: 0.24, expression: 2 },
 ] as const;
export type CompanionActionId = typeof companionActions[number]["id"];
export function companionMotion(index: number, seconds: number) {
  const a = companionActions[index] ?? companionActions[0];
  const t = seconds / a.duration * Math.PI * 2;
  const wave = Math.sin(t), double = Math.sin(2 * t);
  // Lift is nonnegative; compression and translation return continuously at the seam.
  const lift = (1 - Math.cos(t)) / 2;
  return { x: a.x * wave, y: a.lift * lift,
    stretch: 1 + a.stretch * Math.sin(t - .35),
    yaw: a.yaw * wave, pitch: a.pitch * lift,
    roll: a.roll * (wave * .75 + double * .25),
    flex: a.stretch * double * .3, expression: a.expression };
}
