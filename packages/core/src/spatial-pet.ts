import { composeSpatialAttachments } from "./spatial-attachments.js";
import type { AttachmentInstance } from "./attachments.js";
import {
  PetEngine,
  type Activity,
  type Mood,
  type Behavior,
  type EngineOptions,
} from "./index.js";
import { type PetConfig } from "./pet-config.js";
import { createSpatialRenderer } from "./spatial-browser.js";
/** Runtime for 3D pets; rendered exclusively with WebGL. */
export function mountSpatialPet(
  engine: PetEngine,
  options: {
    container: HTMLElement;
    reducedMotion?: boolean;
    instances?: AttachmentInstance[];
    attachments?: PetConfig["attachments"];
  },
) {
  const host = document.createElement("div");
  host.style.cssText = "width:100%;height:100%;touch-action:none";
  host.tabIndex = 0;
  host.setAttribute("role", "img");
  host.setAttribute(
    "aria-label",
    engine.getSkin().name + "，三维宠物，方向键转动视线",
  );
  options.container.append(host);
  const renderer = createSpatialRenderer(host);
  const media = matchMedia("(prefers-reduced-motion: reduce)"),
    abort = new AbortController();
  let time = 0,
    last = 0,
    raf = 0,
    paused = false,
    settleUntil = 0,
    dead = false;
  const draw = () => {
    if (!dead)
      renderer.render(
        composeSpatialAttachments(
          engine.sampleScene(time, options.reducedMotion ?? media.matches),
          options.instances ?? [],
          (options.reducedMotion ?? media.matches) ? 0 : time,
        ),
      );
  };
  const settle = () => {
    settleUntil = time + 0.4;
    draw();
  };
  function tick(now: number) {
    if ((!paused || time < settleUntil) && !document.hidden)
      time += last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if ((!paused || time < settleUntil) && !document.hidden) draw();
    raf = requestAnimationFrame(tick);
  }
  host.addEventListener(
    "pointermove",
    (event) => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      engine.handle(
        {
          type: "look",
          value: {
            x: Math.max(
              -1,
              Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1),
            ),
            y: Math.max(
              -1,
              Math.min(1, ((event.clientY - r.top) / r.height) * 2 - 1),
            ),
          },
        },
        time,
      );
      engine.handle({ type: "hover", value: true }, time);
      draw();
    },
    { signal: abort.signal },
  );
  const leave = () => {
    engine.handle({ type: "hover", value: false }, time);
    draw();
  };
  host.addEventListener("pointerleave", leave, { signal: abort.signal });
  host.addEventListener("pointercancel", leave, { signal: abort.signal });
  host.addEventListener(
    "pointerup",
    (event) => {
      if (event.pointerType !== "mouse") leave();
    },
    { signal: abort.signal },
  );
  host.addEventListener("blur", leave, { signal: abort.signal });
  host.addEventListener(
    "keydown",
    (event) => {
      const keys: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      if (event.key === "Home") {
        event.preventDefault();
        leave();
      } else if (keys[event.key]) {
        event.preventDefault();
        engine.handle({ type: "look", value: keys[event.key]! }, time);
        engine.handle({ type: "hover", value: true }, time);
        draw();
      }
    },
    { signal: abort.signal },
  );
  const observer = new ResizeObserver(draw);
  observer.observe(host);
  media.addEventListener("change", draw, { signal: abort.signal });
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
      host.setAttribute(
        "aria-label",
        engine.getSkin().name + "，三维宠物，方向键转动视线",
      );
      settle();
    },
    setRigConfig(value: NonNullable<EngineOptions["rigConfig"]>) {
      engine.setRigConfig(value, time);
      settle();
    },
    setPose(value: NonNullable<EngineOptions["pose"]>) {
      engine.setPose(value, time);
      settle();
    },
    getRigConfig: () => engine.getRigConfig(),
    getPose: () => engine.getPose(),
    getCharacter: () => engine.getCharacter(),
    exportSkin: () => engine.exportSkin(),
    getSkin: () => engine.getSkin(),
    exportConfig: (): PetConfig => ({
      version: 1,
      skin: engine.getSkin(),
      rigConfig: engine.getRigConfig(),
      pose: engine.getPose(),
      attachments: structuredClone(options.attachments ?? []),
    }),
    getRenderer: () => renderer.backend,
    setDebug(_value: boolean) {},
    setPaused(value: boolean) {
      paused = value;
      draw();
    },
    destroy() {
      if (dead) return;
      dead = true;
      abort.abort();
      observer.disconnect();
      cancelAnimationFrame(raf);
      renderer.destroy();
      host.remove();
    },
  };
}
