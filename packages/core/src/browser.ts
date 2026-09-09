import { createSvgRenderer } from "./svg.js";
export { createSvgRenderer } from "./svg.js";
import {
  PetEngine,
  clamp,
  type Rig,
  type Activity,
  type Mood,
  type Frame,
  type Behavior,
  type EngineOptions,
} from "./index.js";
export function createPet(options: {
  container: HTMLElement;
  rig: Rig;
  skin: unknown;
  debug?: boolean;
  reducedMotion?: boolean;
  rigConfig?: EngineOptions["rigConfig"];
  pose?: EngineOptions["pose"];
  transitionDuration?: EngineOptions["transitionDuration"];
}) {
  const engine = new PetEngine(options.rig, options.skin, {
    transitionDuration: options.transitionDuration,
    rigConfig: options.rigConfig,
    pose: options.pose,
  });
  const renderer = createSvgRenderer(options.container, {
    debug: options.debug,
  });
  const svg = renderer.svg;
  svg.setAttribute("role", "button");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute(
    "aria-label",
    `${engine.getSkin().name}, interactive pet. Press Enter to greet.`,
  );
  svg.style.cssText =
    "width:100%;height:100%;touch-action:none;display:block;cursor:grab;overflow:visible";
  let dead = false,
    paused = false,
    time = 0,
    last = 0,
    raf = 0,
    pointer: number | null = null,
    start = { x: 0, y: 0 },
    moved = false;
  let dragTarget = { x: 0, y: 0 },
    dragCurrent = { x: 0, y: 0 };
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const draw = () => {
    if (!dead)
      renderer.render(
        engine.sample(time, options.reducedMotion ?? media.matches),
      );
  };
  const tick = (ms: number) => {
    if (dead) return;
    const dt = last ? Math.min((ms - last) / 1000, 0.05) : 0;
    if (!paused && !document.hidden) time += dt;
    last = ms;
    if (!paused && !document.hidden) {
      const k =
        (options.reducedMotion ?? media.matches) ? 1 : 1 - Math.exp(-18 * dt);
      dragCurrent = {
        x: dragCurrent.x + (dragTarget.x - dragCurrent.x) * k,
        y: dragCurrent.y + (dragTarget.y - dragCurrent.y) * k,
      };
      engine.handle({ type: "drag", value: dragCurrent }, time);
      draw();
    }
    raf = requestAnimationFrame(tick);
  };
  const abort = new AbortController(),
    signal = abort.signal;
  svg.addEventListener(
    "pointermove",
    (e) => {
      const box = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      engine.handle(
        {
          type: "look",
          value: {
            x: clamp(((e.clientX - box.left) / box.width) * 2 - 1),
            y: clamp(((e.clientY - box.top) / box.height) * 2 - 1),
          },
        },
        time,
      );
      if (pointer === e.pointerId) {
        const dx = ((e.clientX - start.x) / box.width) * 3,
          dy = ((e.clientY - start.y) / box.height) * 3;
        moved ||= Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5;
        dragTarget = { x: clamp(dx), y: clamp(dy) };
        if (paused) {
          dragCurrent = dragTarget;
          engine.handle({ type: "drag", value: dragCurrent }, time);
        }
      }
      draw();
    },
    { signal },
  );
  svg.addEventListener(
    "pointerdown",
    (e) => {
      if (pointer !== null || e.button !== 0) return;
      pointer = e.pointerId;
      start = { x: e.clientX, y: e.clientY };
      moved = false;
      svg.setPointerCapture(pointer);
      engine.handle({ type: "press", value: true }, time);
      draw();
    },
    { signal },
  );
  const release = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return;
    pointer = null;
    engine.handle({ type: "press", value: false }, time);
    dragTarget = { x: 0, y: 0 };
    if (paused) {
      dragCurrent = dragTarget;
      engine.handle({ type: "drag", value: dragCurrent }, time);
    }
    if (e.type === "pointerup" && !moved) engine.handle({ type: "tap" }, time);
    draw();
  };
  svg.addEventListener("pointerup", release, { signal });
  svg.addEventListener("pointercancel", release, { signal });
  svg.addEventListener("lostpointercapture", release, { signal });
  svg.addEventListener(
    "pointerleave",
    () => {
      if (pointer === null) {
        engine.handle({ type: "hover", value: false }, time);
        draw();
      }
    },
    { signal },
  );
  svg.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        engine.handle({ type: "tap" }, time);
        draw();
      }
    },
    { signal },
  );
  draw();
  raf = requestAnimationFrame(tick);
  return {
    play(behavior: Behavior) {
      const accepted = engine.play(behavior, time);
      draw();
      return accepted;
    },
    stop() {
      engine.stop(time);
      draw();
    },
    setActivity(value: Activity) {
      engine.handle({ type: "activity", value }, time);
      draw();
    },
    setMood(value: Mood) {
      engine.handle({ type: "mood", value }, time);
      draw();
    },
    setSkin(value: unknown) {
      engine.setSkin(value, time);
      svg.setAttribute(
        "aria-label",
        `${engine.getSkin().name}, interactive pet. Press Enter to greet.`,
      );
      draw();
    },
    setRigConfig: (value: NonNullable<EngineOptions["rigConfig"]>) => {
      engine.setRigConfig(value, time);
      draw();
    },
    setPose: (value: NonNullable<EngineOptions["pose"]>) => {
      engine.setPose(value, time);
      draw();
    },
    getRigConfig: () => engine.getRigConfig(),
    getPose: () => engine.getPose(),
    getCharacter: () => engine.getCharacter(),
    exportSkin: () => engine.exportSkin(),
    getSkin: () => engine.getSkin(),
    setDebug(value: boolean) {
      renderer.setDebug(value);
      draw();
    },
    setPaused(value: boolean) {
      paused = value;
      draw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      abort.abort();
      cancelAnimationFrame(raf);
      renderer.destroy();
    },
  };
}
