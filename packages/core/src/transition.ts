import type { SvgResource } from "./resources.js";
import { identity2D, type Affine2D } from "./bindings.js";
import type { Frame, Shape } from "./index.js";
const num = /-?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g;
function interpolate(
  a: string | number,
  b: string | number,
  k: number,
): string | number | null {
  if (a === b) return b;
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * k;
  if (typeof a !== "string" || typeof b !== "string") return null;
  if (/^#[\da-f]{6}$/i.test(a) && /^#[\da-f]{6}$/i.test(b))
    return (
      "#" +
      [1, 3, 5]
        .map((i) =>
          Math.round(
            parseInt(a.slice(i, i + 2), 16) * (1 - k) +
              parseInt(b.slice(i, i + 2), 16) * k,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  // Only interpolate compatible path command structures. Arc flags are discrete.
  if (
    !/^[Mm]/.test(a) ||
    /[Aa]/.test(a + b) ||
    a.replace(num, "#") !== b.replace(num, "#")
  )
    return null;
  const av = a.match(num)!.map(Number);
  let i = 0;
  return b.replace(num, (v) => String(av[i]! + (Number(v) - av[i++]!) * k));
}
function fade(shape: Shape, weight: number, id = shape.id): Shape {
  return {
    ...shape,
    id,
    attrs: {
      ...shape.attrs,
      opacity: Number(shape.attrs.opacity ?? 1) * weight,
    },
  };
}
/** Fixed-topology geometry morph; unmatched/incompatible shapes crossfade. */
export function blendFrames(a: Frame, b: Frame, k: number): Frame {
  if (k <= 0) return structuredClone(a);
  if (k >= 1) return structuredClone(b);
  const from = new Map(a.shapes.map((s) => [s.id, s])),
    shapes: Shape[] = [];
  const ids = new Set([...a.shapes, ...b.shapes].map((s) => s.id));
  const outgoing = (s: Shape) => {
    let id = s.id + "~out";
    while (ids.has(id)) id += "~";
    ids.add(id);
    return fade(s, 1 - k, id);
  };
  for (const target of b.shapes) {
    const source = from.get(target.id);
    from.delete(target.id);
    if (!source) {
      shapes.push(fade(target, k));
      continue;
    }
    const attrs: Shape["attrs"] = {};
    let compatible = source.kind === target.kind;
    const keys = new Set([
      ...Object.keys(source.attrs),
      ...Object.keys(target.attrs),
    ]);
    for (const key of keys) {
      const x = source.attrs[key] ?? (key === "opacity" ? 1 : undefined),
        y = target.attrs[key] ?? (key === "opacity" ? 1 : undefined);
      const v =
        x === undefined || y === undefined ? null : interpolate(x, y, k);
      if (v === null) {
        compatible = false;
        break;
      }
      attrs[key] = v;
    }
    if (compatible) {
      const fromMatrix = source.transform ?? identity2D,
        toMatrix = target.transform ?? identity2D;
      const transform =
        source.transform || target.transform
          ? (fromMatrix.map(
              (v, i) => v + (toMatrix[i]! - v) * k,
            ) as unknown as Affine2D)
          : undefined;
      shapes.push({ ...target, attrs, ...(transform ? { transform } : {}) });
    } else shapes.push(outgoing(source), fade(target, k));
  }
  for (const s of from.values()) shapes.push(fade(s, 1 - k));
  const bounds = { ...b.bounds };
  for (const key of ["x", "y", "width", "height"] as const)
    bounds[key] = a.bounds[key] + (b.bounds[key] - a.bounds[key]) * k;
  const resources: SvgResource[] = [];
  const previous = new Map((a.resources ?? []).map((r) => [r.id, r]));
  for (const next of b.resources ?? []) {
    const old = previous.get(next.id);
    previous.delete(next.id);
    if (old?.kind === "mask" && next.kind === "mask")
      resources.push({
        ...next,
        shapes: blendFrames(
          { shapes: old.shapes, anchors: [], bounds: a.bounds },
          { shapes: next.shapes, anchors: [], bounds: b.bounds },
          k,
        ).shapes,
      });
    else if (
      old?.kind === "linearGradient" &&
      next.kind === "linearGradient" &&
      old.stops.length === next.stops.length
    ) {
      resources.push({
        ...next,
        x1: old.x1 + (next.x1 - old.x1) * k,
        y1: old.y1 + (next.y1 - old.y1) * k,
        x2: old.x2 + (next.x2 - old.x2) * k,
        y2: old.y2 + (next.y2 - old.y2) * k,
        stops: next.stops.map((v, i) => ({
          offset: old.stops[i]!.offset + (v.offset - old.stops[i]!.offset) * k,
          color: interpolate(old.stops[i]!.color, v.color, k) as string,
        })),
      });
    } else resources.push(next);
  }
  resources.push(...previous.values());
  return {
    ...(resources.length ? { resources } : {}),
    ...(b.viewBox ? { viewBox: b.viewBox } : {}),
    shapes,
    bounds,
    anchors:
      a.anchors.length === b.anchors.length
        ? b.anchors.map((p, i) => ({
            x: a.anchors[i]!.x + (p.x - a.anchors[i]!.x) * k,
            y: a.anchors[i]!.y + (p.y - a.anchors[i]!.y) * k,
          }))
        : b.anchors,
  };
}
