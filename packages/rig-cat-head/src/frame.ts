import type {
  Rig,
  Frame,
  Shape,
  Skin,
  SvgResource,
  Affine2D,
} from "@mofli/core";
import { BotEngine, type BotFrame } from "./vendor/engine.js";
import { SEQUENCE, STATE_BY_ID, POSES } from "./vendor/states.js";
import { mixHex } from "./vendor/skins.js";
import { NOTIF_BLUE } from "./vendor/decor.js";
export const bloubStates = SEQUENCE.map((id, index) => ({
  id,
  index,
  duration: STATE_BY_ID.get(id)!.duration,
  posterTime: POSES[id],
}));
export const bloubDuration = bloubStates.reduce((n, s) => n + s.duration, 0);
const circle = (
  id: string,
  x: number,
  y: number,
  r: number,
  fill: string,
  opacity = 1,
): Shape => ({
  id,
  kind: "ellipse",
  attrs: { cx: x, cy: y, rx: r, ry: r, fill, opacity },
});
/** Translate upstream geometric output, not DOM or serialized SVG, into Mofli primitives. */
export function characterFrame(
  frame: BotFrame,
  ink = "#0a0a0c",
  paper = "#f9f9f9",
  eyeStyle = "capsule",
  irritated = 0,
  eyeBounce = 0,
): Frame {
  const resources: SvgResource[] = [
    {
      id: "face-mask",
      kind: "mask",
      shapes: [
        {
          id: "silhouette",
          kind: "path",
          attrs: { d: frame.bodyPath, fill: "#ffffff" },
        },
        ...frame.eyes.map((eye, i): Shape => ({
          id: `eye-${i}`,
          kind: "path",
          attrs: {
            d: eyeStyle === "oval" ? ovalEye(eye.width, eye.height) : eye.d,
            fill: "#000000",
            opacity: eye.alpha * (1-irritated),
          },
          transform: eye.matrix
            .slice(7, -1)
            .split(",")
            .map(Number) as unknown as Affine2D,
        })),
        ...frame.eyes.map((eye,i): Shape => ({
          id: `irritated-eye-${i}`, kind: "path",
          attrs: { d: irritatedEye(i, eyeBounce), fill: "none", stroke: "#000000", "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: eye.alpha*irritated },
          transform: eye.matrix.slice(7,-1).split(",").map(Number) as unknown as Affine2D,
        })),
        ...(frame.notch
          ? [
              circle(
                "notch",
                frame.notch.x,
                frame.notch.y,
                frame.notch.r,
                "#000000",
              ),
            ]
          : []),
      ],
    },
    ...frame.arcs.map((arc): SvgResource => ({
      id: arc.id,
      kind: "linearGradient",
      x1: arc.grad.x1,
      y1: arc.grad.y1,
      x2: arc.grad.x2,
      y2: arc.grad.y2,
      stops: arc.grad.stops.map((color, i) => ({
        offset: i / (arc.grad.stops.length - 1),
        color,
      })),
    })),
  ];
  const arcs = (side: "back" | "front") =>
    frame.arcs.map((arc): Shape => ({
      id: `${side}-${arc.id}`,
      kind: "path",
      attrs: {
        d: arc[side],
        fill: "none",
        "stroke-width": arc.width,
        "stroke-linecap": "round",
        opacity: arc.opacity,
      },
      paint: { stroke: arc.id },
    }));
  const dots = frame.dots.map((dot, i): Shape => {
    const color =
      dot.color ??
      (dot.depth === undefined ? ink : mixHex(paper, ink, dot.depth));
    if (!dot.d)
      return circle(`dot-${i}`, dot.x, dot.y, dot.r, color, dot.opacity);
    const a = ((dot.rot ?? 0) * Math.PI) / 180,
      c = Math.cos(a) * 100,
      s = Math.sin(a) * 100;
    return {
      id: `dot-${i}`,
      kind: "path",
      attrs: { d: dot.d, fill: color, opacity: dot.opacity },
      transform: [c, s, -s, c, dot.x, dot.y],
    };
  });
  return {
    viewBox: { x: -158, y: -158, width: 316, height: 316 },
    resources,
    shapes: [
      ...arcs("back"),
      ...(frame.dotsBehind ? dots : []),
      {
        id: "paper-body",
        kind: "path",
        attrs: { d: frame.bodyPath, fill: paper, opacity: frame.bodyAlpha },
      },
      {
        id: "ink-body",
        kind: "rect",
        attrs: {
          x: -158,
          y: -158,
          width: 316,
          height: 316,
          fill: ink,
          opacity: frame.bodyAlpha,
        },
        mask: "face-mask",
      },
      ...(!frame.dotsBehind ? dots : []),
      ...(frame.notif
        ? [
            circle(
              "notification",
              frame.notif.x,
              frame.notif.y,
              frame.notif.r,
              NOTIF_BLUE,
            ),
          ]
        : []),
      ...arcs("front"),
    ],
    anchors: [],
    bounds: { x: -158, y: -158, width: 316, height: 316 },
  };
}

function ovalEye(w: number, h: number) {
  const x = w / 2,
    y = h / 2,
    k = 0.55228475;
  return `M${x} 0 C${x} ${y * k} ${x * k} ${y} 0 ${y} C${-x * k} ${y} ${-x} ${y * k} ${-x} 0 C${-x} ${-y * k} ${-x * k} ${-y} 0 ${-y} C${x * k} ${-y} ${x} ${-y * k} ${x} 0 Z`;
}

function irritatedEye(side: number, bounce: number) {
  const mirror=side === 0 ? 1 : -1;
  const x=(v:number)=>v*mirror*(1+bounce*.22);
  const y=(v:number)=>v*(1-bounce*.15);
  // Curved arms and a rounded inward tip keep the squeezed eyes soft.
  return `M${x(-7)} ${y(-9)} Q${x(-1)} ${y(-7)} ${x(5)} ${y(-1.5)} Q${x(7)} 0 ${x(5)} ${y(1.5)} Q${x(-1)} ${y(7)} ${x(-7)} ${y(9)}`;
}
