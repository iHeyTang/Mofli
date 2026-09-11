import { useEffect, useRef } from "react";
import { createSpatialRenderer } from "@mofli/core/spatial-browser";
import { model } from "./model.js";
export function SpatialStage() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const surface = host.current!,
      interaction = surface.parentElement!,
      renderer = createSpatialRenderer(surface),
      abort = new AbortController(),
      media = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0,
      last = 0,
      settleUntil = 0,
      displayedSkin = "";
    const draw = () => {
      if (!model.is3D) return;
      model.syncSequence();
      const signature = JSON.stringify([
        model.pose,
        model.config,
        model.skin.colors,
      ]);
      if (displayedSkin !== signature) {
        displayedSkin = signature;
        settleUntil = model.time + 0.4;
      }
      renderer.render(model.scene(media.matches));
    };
    const tick = (now: number) => {
      if ((model.playing || model.time < settleUntil) && !document.hidden) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        model.time += dt;
        if (!model.playing) model.timelineStart += dt;
      }
      last = now;
      if (!document.hidden && renderer.backend === "webgl") {
        draw();
      }
      const code = document.getElementById("timecode");
      if (code)
        code.textContent = `${model.progress.toFixed(2)} / ${model.duration.toFixed(2)} s`;
      raf = requestAnimationFrame(tick);
    };
    const unsubscribe = model.subscribe(() => {
      draw();
    });
    interaction.addEventListener(
      "pointermove",
      (event) => {
        const r = interaction.getBoundingClientRect();
        model.engine.handle(
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
          model.time,
        );
        model.engine.handle({ type: "hover", value: true }, model.time);
      },
      { signal: abort.signal },
    );
    const leave = () =>
      model.engine.handle({ type: "hover", value: false }, model.time);
    interaction.addEventListener("pointerleave", leave, {
      signal: abort.signal,
    });
    interaction.addEventListener("pointercancel", leave, {
      signal: abort.signal,
    });
    interaction.addEventListener(
      "pointerup",
      (event) => {
        if (event.pointerType !== "mouse") leave();
      },
      { signal: abort.signal },
    );
    surface.addEventListener(
      "keydown",
      (event) => {
        const axis =
          event.key === "ArrowLeft" || event.key === "ArrowRight"
            ? "yaw"
            : event.key === "ArrowUp" || event.key === "ArrowDown"
              ? "pitch"
              : undefined;
        if (axis) {
          event.preventDefault();
          const r = model.entry.rig.poseParameters?.[axis];
          if (r)
            model.setPose({
              [axis]: Math.max(
                r.min,
                Math.min(
                  r.max,
                  (model.pose[axis] ?? 0) +
                    (["ArrowLeft", "ArrowUp"].includes(event.key) ? -0.1 : 0.1),
                ),
              ),
            });
        }
      },
      { signal: abort.signal },
    );
    draw();
    raf = requestAnimationFrame(tick);
    return () => {
      unsubscribe();
      abort.abort();
      cancelAnimationFrame(raf);
      renderer.destroy();
    };
  }, [model.engine]);
  return (
    <div
      id="stage"
      className="canvas spatial-canvas"
      style={{ backgroundColor: model.skin.colors.paper ?? "#f9f9f6" }}
    >
      <div
        id="avatar"
        ref={host}
        tabIndex={0}
        role="img"
        aria-label="三维宠物，方向键旋转"
        style={{ transform: `scale(${model.zoom})` }}
      />
    </div>
  );
}
