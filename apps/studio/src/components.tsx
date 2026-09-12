import { requestSpatialThumbnail } from "./spatial-thumbnails.js";
import { SpatialStage } from "./spatial-stage.js";
import {
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button, Slider, Label } from "@heroui/react";
import {
  PetEngine,
  composeAttachments,
  type Attachment,
  type Rig,
  type Skin,
  type RigConfig,
  type RigPose,
} from "@mofli/core";
import { createSvgRenderer } from "@mofli/core/browser";
import { model } from "./model.js";
export function useModel() {
  useSyncExternalStore(model.subscribe, model.snapshot);
  return model;
}
export function Action({
  children,
  onPress,
  title,
  id,
  primary = false,
  disabled = false,
}: {
  children: ReactNode;
  onPress: () => void;
  title?: string;
  id?: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      id={id}
      size="sm"
      variant={primary ? "primary" : "ghost"}
      onPress={onPress}
      aria-label={title}
      isDisabled={disabled}
    >
      {children}
    </Button>
  );
}
export function Thumbnail(props: Parameters<typeof SvgThumbnail>[0]) {
  return props.rig.dimension === "3d" ? (
    <SpatialThumbnail {...props} />
  ) : (
    <SvgThumbnail {...props} />
  );
}
function SpatialThumbnail({
  rig,
  skin,
  config = {},
  pose = {},
  time = 1,
  spatialAccessory,
  spatialInstance,
}: Parameters<typeof SvgThumbnail>[0]) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = JSON.stringify([
    skin,
    config,
    pose,
    time,
    spatialAccessory,
    spatialInstance,
  ]);
  useEffect(() => {
    const host = ref.current!;
    host.replaceChildren();
    const filtered = Object.fromEntries(
      Object.entries(pose).filter(([key]) => key in (rig.poseParameters ?? {})),
    );
    return requestSpatialThumbnail(
      rig,
      skin,
      config,
      filtered,
      time,
      (url) => {
        if (!url) {
          host.textContent = "预览不可用";
          return;
        }
        const img = new Image();
        img.src = url;
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        img.style.cssText = "width:100%;height:100%;object-fit:contain";
        host.replaceChildren(img);
      },
      spatialAccessory,
      spatialInstance,
    );
  }, [rig, signature]);
  return <div className="pet-thumbnail" ref={ref} />;
}
function SvgThumbnail({
  rig,
  skin,
  config = {},
  pose = {},
  time = 1,
  attachment,
  accessoryOnly = false,
}: {
  rig: Rig;
  skin: Skin;
  config?: RigConfig;
  pose?: RigPose;
  time?: number;
  attachment?: Attachment;
  accessoryOnly?: boolean;
  spatialAccessory?: string;
  spatialInstance?: import("@mofli/core").AttachmentInstance;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = JSON.stringify([
    skin,
    config,
    pose,
    time,
    attachment?.id,
    accessoryOnly,
  ]);
  useEffect(() => {
    const renderer = createSvgRenderer(ref.current!);
    const filtered = Object.fromEntries(
      Object.entries(pose).filter(([k]) => k in (rig.poseParameters ?? {})),
    );
    const frame = new PetEngine(rig, skin, {
      rigConfig: config,
      pose: filtered,
    }).sample(time, true);
    // Catalog thumbnails pack paired pieces together; the actual pet keeps rig spacing.
    if (accessoryOnly && attachment) {
      const members = frame.mounts?.[attachment.mount]?.members;
      if (members) {
        const values = Object.values(members),
          center =
            values.reduce((sum, m) => sum + (m.volume?.origin.x ?? 0), 0) /
            values.length;
        for (const member of values)
          if (member.volume) {
            const x = center + (member.volume.origin.x - center) * 0.35;
            member.volume.origin.x = x;
            const [a, b, c, d, , y] = member.matrix;
            member.matrix = [a, b, c, d, x, y];
          }
      }
    }
    const mounted = attachment
      ? composeAttachments(frame, [{ id: "preview", attachment }])
      : frame;
    if (accessoryOnly)
      mounted.shapes = mounted.shapes.filter((s) =>
        s.id.startsWith("attachment-preview-"),
      );
    renderer.render(mounted);
    if (accessoryOnly) {
      const box = renderer.svg.getBBox();
      const pad = Math.max(box.width, box.height) * 0.16 + 3;
      renderer.svg.setAttribute(
        "viewBox",
        `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`,
      );
    }
    renderer.svg.setAttribute("aria-hidden", "true");
    return () => renderer.destroy();
  }, [rig, signature]);
  return <div className="pet-thumbnail" ref={ref} />;
}
export function Range({
  id,
  label,
  value,
  min,
  max,
  onChange,
  step = 0.01,
  showPercent = false,
}: {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  step?: number;
  showPercent?: boolean;
}) {
  return (
    <Slider
      id={id}
      className="parameter-slider"
      aria-label={label}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      formatOptions={showPercent ? { style: "percent" } : undefined}
      onChange={(v) => onChange(Math.max(min, Math.min(max, Number(v))))}
    >
      <Label>{label}</Label>
      <Slider.Output>{showPercent ? `${Math.round(value * 100)}%` : Number(value).toFixed(2)}</Slider.Output>
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}
export function PlaybackSlider() {
  const m = useModel();
  const [, refresh] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => refresh((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <Slider
      id="seek"
      className="playback-slider"
      aria-label="播放进度"
      minValue={0}
      maxValue={m.duration}
      step={0.01}
      value={m.progress}
      onChange={(v) => m.seek(Number(v))}
    >
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}

export function PetStage() {
  const m = useModel();
  return m.is3D ? <SpatialStage /> : <SvgPetStage />;
}
function SvgPetStage() {
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const m = useModel();
  useEffect(() => {
    const renderer = createSvgRenderer(host.current!);
    const svg = renderer.svg;
    const surface = stage.current!;
    svg.setAttribute("role", "button");
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("aria-label", "互动宠物，点击或按 Enter 打招呼");
    let raf = 0,
      last = 0,
      pointer: { id: number; x: number; y: number; moved: boolean } | null =
        null;
    const abort = new AbortController();
    const signal = abort.signal;
    const draw = () => {
      renderer.setDebug(model.debug);
      renderer.render(model.frame());
    };
    const tick = (now: number) => {
      if (model.playing && !document.hidden)
        model.time += last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      draw();
      const code = document.getElementById("timecode");
      if (code)
        code.textContent = `${model.progress.toFixed(2)} / ${model.duration.toFixed(2)} s`;
      raf = requestAnimationFrame(tick);
    };
    surface.addEventListener(
      "pointermove",
      (e) => {
        const r = surface.getBoundingClientRect();
        model.engine.handle(
          {
            type: "look",
            value: {
              x: Math.max(
                -1,
                Math.min(1, (2 * (e.clientX - r.left)) / r.width - 1),
              ),
              y: Math.max(
                -1,
                Math.min(1, (2 * (e.clientY - r.top)) / r.height - 1),
              ),
            },
          },
          model.time,
        );
        if (pointer) {
          if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 5)
            pointer.moved = true;
          if (pointer.moved)
            model.engine.handle(
              {
                type: "drag",
                value: {
                  x: (e.clientX - pointer.x) / r.width,
                  y: (e.clientY - pointer.y) / r.height,
                },
              },
              model.time,
            );
        }
      },
      { signal },
    );
    surface.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 || pointer) return;
        e.preventDefault();
        svg.focus({ preventScroll: true });
        pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        surface.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    const release = (e: PointerEvent) => {
      if (!pointer || e.pointerId !== pointer.id) return;
      if (e.type === "pointerup" && !pointer.moved)
        model.engine.handle(
          {
            type: "tap",
            hit: renderer.hitTest(e.clientX, e.clientY),
            at: performance.now() / 1000,
            choice: Math.random(),
          },
          model.time,
        );
      model.engine.handle({ type: "drag", value: { x: 0, y: 0 } }, model.time);
      pointer = null;
      const r = surface.getBoundingClientRect();
      if (
        e.pointerType !== "mouse" ||
        e.type !== "pointerup" ||
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        model.engine.handle({ type: "hover", value: false }, model.time);
    };
    surface.addEventListener("pointerup", release, { signal });
    surface.addEventListener("pointercancel", release, { signal });
    surface.addEventListener("lostpointercapture", release, { signal });
    surface.addEventListener(
      "pointerleave",
      () => {
        if (!pointer)
          model.engine.handle({ type: "hover", value: false }, model.time);
      },
      { signal },
    );
    window.addEventListener(
      "blur",
      () => {
        pointer = null;
        model.engine.handle(
          { type: "drag", value: { x: 0, y: 0 } },
          model.time,
        );
        model.engine.handle({ type: "hover", value: false }, model.time);
      },
      { signal },
    );
    svg.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          model.engine.handle(
            {
              type: "tap",
              at: performance.now() / 1000,
              choice: Math.random(),
            },
            model.time,
          );
        }
      },
      { signal },
    );
    raf = requestAnimationFrame(tick);
    return () => {
      abort.abort();
      cancelAnimationFrame(raf);
      renderer.destroy();
    };
  }, []);
  return (
    <div
      ref={stage}
      className="canvas"
      id="stage"
      style={{ backgroundColor: m.skin.colors.paper ?? "#f6f7f3" }}
    >
      <div id="avatar" ref={host} style={{ transform: `scale(${m.zoom})` }} />
      {m.debug && (
        <div className="canvas-hint">
          X / Y / Z：局部方向 · 虚线：表面采样或角色单位范围
        </div>
      )}
    </div>
  );
}
