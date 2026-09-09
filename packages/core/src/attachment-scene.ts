import {resolveSceneChannels,type SceneChannels} from './scene-values.js';
import {
  attachmentSolidFaces,
  type AttachmentSolid,
  type AttachmentFace,
} from "./attachment-solids.js";
import type { Attachment, AttachmentContext } from "./attachments.js";
import type { Shape } from "./index.js";

export type AttachmentPoint = readonly [number, number, number];
type Cubic = readonly [number, number, number, number, number, number];
export type AttachmentMotion = {
  kind: "sway";
  amplitude?: number;
  frequency?: number;
  phase?: number;
  lag?: number;
};
interface Binding {
  localTransform?:readonly [number,number,number,number,number,number];
  member?: string;
  surface?: boolean;
  motion?: AttachmentMotion;
}
export type AttachmentGeometry =
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      z?: number;
    }
  | { kind: "path"; d: string }
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
    }
  | { kind: "polygon"; points: readonly AttachmentPoint[] }
  | { kind: "roundedPolygon"; points: readonly AttachmentPoint[] }
  | {
      kind: "cubic";
      start: readonly [number, number];
      segments: readonly Cubic[];
    };
export interface AttachmentNode extends Binding {
  id: string;
  geometry: AttachmentGeometry;
  attrs: { fill: string; opacity?: number };
}
export interface AttachmentMesh {
  kind: "mesh";
  id: string;
  faces: readonly (AttachmentFace | AttachmentSolid)[];
  cull?: "negative" | "positive";
  seamWidth?: number;
}
export interface AttachmentScene extends SceneChannels {
  version: 1;
  nodes: readonly (AttachmentNode | AttachmentMesh)[];
}
export interface AttachmentSceneInput {
  time: number;
  parameters: Readonly<Record<string, number>>;
}
export interface AttachmentDefinition {
  id: string;
  mount: string;
  slot: string;
  parameters?: Attachment["parameters"];
  /** Uniform authored geometry scale, applied before mount projection. */
  scaleParameter?: string;
  space?: "projected" | "flat";
  scene: AttachmentScene | ((input: AttachmentSceneInput) => AttachmentScene);
}

const oval = (
  x: number,
  y: number,
  rx: number,
  ry: number,
  z = 0,
): AttachmentPoint[] =>
  Array.from({ length: 32 }, (_, i) => {
    const t = (i * Math.PI) / 16;
    return [x + rx * Math.cos(t), y + ry * Math.sin(t), z];
  });
function cubic(
  start: readonly [number, number],
  segments: readonly Cubic[],
): AttachmentPoint[] {
  const points: AttachmentPoint[] = [[...start, 0]];
  let [x, y] = start;
  for (const [a, b, c, d, e, f] of segments) {
    for (let i = 1; i <= 20; i++) {
      const t = i / 20,
        u = 1 - t;
      points.push([
        u * u * u * x + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * e,
        u * u * u * y + 3 * u * u * t * b + 3 * u * t * t * d + t * t * t * f,
        0,
      ]);
    }
    x = e;
    y = f;
  }
  return points;
}
/** Explicit supported SVG subset. Reject unsupported commands rather than silently distort them. */
function pathPoints(d: string): AttachmentPoint[] {
  const tokens =
    d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  if (
    d.replace(
      /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g,
      "",
    )
  )
    throw new Error("Invalid attachment path");
  let at = 0,
    x = 0,
    y = 0;
  const points: AttachmentPoint[] = [];
  const number = () => {
    const value = Number(tokens[at++]);
    if (!Number.isFinite(value))
      throw new Error("Invalid attachment path coordinate");
    return value;
  };
  while (at < tokens.length) {
    const cmd = tokens[at++];
    if ((cmd === "M" && points.length) || (cmd !== "M" && !points.length))
      throw new Error("Attachment path requires one initial M");
    if (cmd === "M" || cmd === "L") {
      x = number();
      y = number();
      points.push([x, y, 0]);
    } else if (cmd === "C") {
      const segment = [
        number(),
        number(),
        number(),
        number(),
        number(),
        number(),
      ] as const;
      points.push(...cubic([x, y], [segment]).slice(1));
      x = segment[4];
      y = segment[5];
    } else if (cmd === "Q") {
      const a = number(),
        b = number(),
        c = number(),
        e = number();
      points.push(
        ...cubic(
          [x, y],
          [
            [
              x + (2 * (a - x)) / 3,
              y + (2 * (b - y)) / 3,
              c + (2 * (a - c)) / 3,
              e + (2 * (b - e)) / 3,
              c,
              e,
            ],
          ],
        ).slice(1),
      );
      x = c;
      y = e;
    } else if (cmd === "Z") {
      if (at !== tokens.length)
        throw new Error("Use separate nodes for attachment subpaths");
    } else
      throw new Error(
        `Unsupported attachment path command: ${cmd}; use absolute M/L/Q/C/Z`,
      );
  }
  return points;
}
function geometryPoints(g: AttachmentGeometry): readonly AttachmentPoint[] {
  switch (g.kind) {
    case "ellipse":
      return oval(g.cx, g.cy, g.rx, g.ry, g.z);
    case "path":
      return pathPoints(g.d);
    case "rect": {
      const { x, y, width: w, height: h } = g,
        r = Math.min(g.rx ?? 0, w / 2, h / 2);
      return pathPoints(
        `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`,
      );
    }
    case "polygon":
      return g.points;
    case "cubic":
      return cubic(g.start, g.segments);
    case "roundedPolygon": {
      const pts = g.points,
        result: AttachmentPoint[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[(i + pts.length - 1) % pts.length]!,
          b = pts[i]!,
          c = pts[(i + 1) % pts.length]!;
        for (let j = 0; j < 8; j++) {
          const t = j / 8;
          result.push(
            [0, 1, 2].map(
              (k) =>
                ((1 - t) ** 2 * (a[k]! + b[k]!)) / 2 +
                2 * (1 - t) * t * b[k]! +
                (t * t * (b[k]! + c[k]!)) / 2,
            ) as unknown as AttachmentPoint,
          );
        }
      }
      return result;
    }
  }
}
function animate(
  p: AttachmentPoint,
  m: AttachmentMotion | undefined,
  ctx: AttachmentContext,
  member?: string,
): AttachmentPoint {
  if (!m) return p;
  const phase = m.phase ?? (member === "right" ? 1.3 : 0.25),
    t = ctx.time;
  const origin = ctx.project([0, 0, 0], member),
    up = ctx.project([0, -1, 0], member);
  const roll = Math.atan2(up.x - origin.x, origin.y - up.y);
  const angle =
    -roll * 0.35 +
    (m.amplitude ?? 0.14) * Math.sin(t * (m.frequency ?? 2.15) + phase) +
    0.045 * Math.sin(t * 3.7 + phase);
  const c = Math.cos(angle),
    s = Math.sin(angle),
    [x, y, z] = p;
  return [
    x * c -
      y * s +
      Math.max(0, y) ** 2 *
        (m.lag ?? 0.2) *
        Math.sin(t * (m.frequency ?? 2.15) + phase - 1.2),
    x * s + y * c,
    z,
  ];
}
const path = (points: readonly { x: number; y: number }[]) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
    .join(" ") + " Z";
/** All geometry projection, surface binding, sway and mesh ordering live here. */
export function renderAttachmentScene(
  scene: AttachmentScene,
  ctx: AttachmentContext,
  scale = 1,
): Shape[] {
  if (
    scene.version !== 1 ||
    !Array.isArray(scene.nodes) ||
    !Number.isFinite(scale) ||
    scale <= 0
  )
    throw new Error("Invalid attachment scene");
  const ids = new Set<string>(),
    out: Shape[] = [];
  for (const node of scene.nodes as AttachmentScene["nodes"]) {
    if (!node.id || ids.has(node.id))
      throw new Error("Duplicate attachment scene node");
    ids.add(node.id);
    if ("kind" in node && node.kind === "mesh") {
      const faces = node.faces
        .flatMap((f) => ("kind" in f ? attachmentSolidFaces(f) : [f]))
        .map((f, i) => {
          if (f.points.some((p) => p.length !== 3 || !p.every(Number.isFinite)))
            throw new Error("Invalid mesh coordinates");
          return {
            id: i,
            fill: f.fill,
            points: f.points.map(([x, y, z]) =>
              ctx.project([x * scale, y * scale, z * scale]),
            ),
          };
        });
      faces.sort(
        (a, b) =>
          a.points.reduce((s, p) => s + p.depth, 0) / a.points.length -
          b.points.reduce((s, p) => s + p.depth, 0) / b.points.length,
      );
      for (const f of faces) {
        const [a, b, c] = f.points;
        if (!a || !b || !c) throw new Error("Mesh face requires three points");
        const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        out.push({
          id: node.id + f.id,
          kind: "path",
          attrs: {
            opacity: node.cull
              ? (node.cull === "negative" ? cross < -1e-7 : cross > 1e-7)
                ? 1
                : 0
              : 1,
            d: path(f.points),
            fill: f.fill,
            stroke: f.fill,
            "stroke-width": node.seamWidth ?? 0.24,
            "stroke-linejoin": "round",
          },
        });
      }
    } else {
      const n = node as AttachmentNode;
      if (
        n.attrs.opacity !== undefined &&
        (!Number.isFinite(n.attrs.opacity) ||
          n.attrs.opacity < 0 ||
          n.attrs.opacity > 1)
      )
        throw new Error("Invalid scene opacity");
      if (
        n.motion &&
        (n.motion.kind !== "sway" ||
          Object.values(n.motion).some(
            (v) => typeof v === "number" && !Number.isFinite(v),
          ))
      )
        throw new Error("Invalid scene motion");
      const local = geometryPoints(n.geometry);
      if (
        local.length < 3 ||
        local.some((p) => p.length !== 3 || !p.every(Number.isFinite))
      )
        throw new Error("Invalid attachment geometry");
      const points = local
        .map(([x,y,z]):AttachmentPoint=>{const m=n.localTransform;return m?[m[4]+x*m[0]+y*m[2],m[5]+x*m[1]+y*m[3],z]:[x,y,z]})
        .map((p) => animate(p, n.motion, ctx, n.member))
        .map(([x, y, z]) =>
          n.surface
            ? ctx.surface([x * scale, y * scale], n.member)
            : ctx.project([x * scale, y * scale, z * scale], n.member),
        );
      if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
        throw new Error("Invalid attachment geometry");
      out.push({
        id: n.id,
        kind: "path",
        attrs: { d: path(points), ...n.attrs, "stroke-linejoin": "round" },
      });
    }
  }
  return out;
}
/** Simple accessories provide data; procedural authors receive time/parameters, never the camera. */
export function defineAttachment(def: AttachmentDefinition): Attachment {
  if (def.scaleParameter && !def.parameters?.[def.scaleParameter])
    throw new Error("Unknown scene scale parameter");
  return {
    id: def.id,
    mount: def.mount,
    slot: def.slot,
    parameters: def.parameters,
    volume: def.space !== "flat",
    sample: (ctx, parameters) => {
      const authored =
        typeof def.scene === "function"
          ? def.scene({ time: ctx.time, parameters })
          : def.scene;
      const scene=resolveSceneChannels(authored,ctx.time,parameters);
      const scale = def.scaleParameter
        ? (parameters[def.scaleParameter] ?? 1)
        : 1;
      if (def.space !== "flat") return renderAttachmentScene(scene, ctx, scale);
      if (scene.version !== 1) throw new Error("Invalid attachment scene");
      return scene.nodes.map((node): Shape => {
        if ("kind" in node || node.member || node.surface || node.motion || node.localTransform)
          throw new Error(
            "Flat scenes do not support meshes, members, surfaces or motion",
          );
        if (
          node.geometry.kind !== "path" &&
          node.geometry.kind !== "ellipse" &&
          node.geometry.kind !== "rect"
        )
          throw new Error("Unsupported flat geometry");
        const { kind, ...geometry } = node.geometry;
        return {
          id: node.id,
          kind,
          attrs: { ...geometry, ...node.attrs },
          ...(scale !== 1
            ? { transform: [scale, 0, 0, scale, 0, 0] as const }
            : {}),
        };
      });
    },
  };
}
/** Optional geometry authoring helpers. These collect local scene data and do not render. */
export function attachmentSceneBuilder(motion?: AttachmentMotion) {
  const nodes: AttachmentNode[] = [];
  const add = (
    geometry: AttachmentGeometry,
    fill: string,
    member?: string,
    surface = false,
  ) => {
    nodes.push({
      id: "part-" + nodes.length,
      geometry,
      attrs: { fill },
      ...(member ? { member } : {}),
      ...(surface ? { surface } : {}),
      ...(motion ? { motion } : {}),
    });
  };
  return {
    nodes,
    oval: (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      z = 0,
    ): AttachmentGeometry => ({ kind: "ellipse", cx, cy, rx, ry, z }),
    draw: (
      points: readonly AttachmentPoint[] | AttachmentGeometry,
      fill: string,
      member?: string,
      surface = false,
    ) =>
      add(
        "kind" in points ? points : { kind: "polygon", points },
        fill,
        member,
        surface,
      ),
    soft: (
      points: readonly AttachmentPoint[],
      fill: string,
      member?: string,
      surface = false,
    ) => add({ kind: "roundedPolygon", points }, fill, member, surface),
    curve: (
      start: readonly [number, number],
      segments: readonly Cubic[],
      fill: string,
      member?: string,
      surface = false,
    ) => add({ kind: "cubic", start, segments }, fill, member, surface),
  };
}
