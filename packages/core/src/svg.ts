import { renderMountDebug } from './mount-debug.js';
import type { Frame, Shape, SvgResource } from "./index.js";
const NS = "http://www.w3.org/2000/svg";
const allowed = new Set([
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "cx",
  "cy",
  "rx",
  "ry",
  "x",
  "y",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
]);
/** Low-level typed SVG renderer. Resource names are isolated per instance. */
export function createSvgRenderer(
  container: HTMLElement,
  options: { debug?: boolean } = {},
) {
  let dead = false,
    debug = options.debug ?? false;
  const prefix = "mofli-" + crypto.randomUUID();
  const localId = (name: string) =>
    prefix +
    "-" +
    Array.from(name)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join("-");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 320");
  svg.setAttribute("role", "img");
  const defs = document.createElementNS(NS, "defs"),
    body = document.createElementNS(NS, "g"),
    debugLayer = document.createElementNS(NS, "g");
  svg.append(defs, body, debugLayer);
  container.append(svg);
  const nodes = new Map<string, SVGElement>();
  let currentFrame: Frame | undefined;
  function validateShape(
    shape: Shape,
    resources: Map<string, SvgResource>,
    inMask = false,
  ) {
    if (!["path", "ellipse", "rect", "line"].includes(shape.kind))
      throw new Error("Unsupported shape");
    if (
      shape.transform &&
      (shape.transform.length !== 6 || !shape.transform.every(Number.isFinite))
    )
      throw new Error("Invalid shape transform");
    for (const [key, value] of Object.entries(shape.attrs))
      if (
        !allowed.has(key) ||
        (typeof value === "number" && !Number.isFinite(value)) ||
        /url\s*\(/i.test(String(value))
      )
        throw new Error("Unsafe graphic attribute");
    if (inMask && (shape.mask || shape.paint))
      throw new Error("Nested resource references are not supported");
    if (shape.mask && resources.get(shape.mask)?.kind !== "mask")
      throw new Error("Unknown mask");
    if (
      Object.keys(shape.paint ?? {}).some((k) => k !== "fill" && k !== "stroke")
    )
      throw new Error("Invalid paint slot");
    for (const id of Object.values(shape.paint ?? {}))
      if (resources.get(id)?.kind !== "linearGradient")
        throw new Error("Unknown gradient");
  }
  function paint(node: SVGElement, shape: Shape) {
    const attrs: Record<string, string | number> = { ...shape.attrs };
    if (shape.transform)
      attrs.transform = `matrix(${shape.transform.join(" ")})`;
    if (shape.mask) attrs.mask = `url(#${localId(shape.mask)})`;
    for (const [key, id] of Object.entries(shape.paint ?? {}))
      attrs[key] = `url(#${localId(id)})`;
    for (const key of node.getAttributeNames())
      if (!(key in attrs)) node.removeAttribute(key);
    for (const [key, value] of Object.entries(attrs))
      if (node.getAttribute(key) !== String(value))
        node.setAttribute(key, String(value));
  }
  function render(frame: Frame) {
    if (dead) throw new Error("Renderer is destroyed");
    const resources = new Map<string, SvgResource>();
    for (const resource of frame.resources ?? []) {
      if (resources.has(resource.id)) throw new Error("Duplicate resource id");
      resources.set(resource.id, resource);
    }
    const ids = new Set<string>();
    for (const shape of frame.shapes) {
      if (ids.has(shape.id)) throw new Error("Duplicate shape id");
      ids.add(shape.id);
      validateShape(shape, resources);
    }
    for (const resource of resources.values()) {
      if (resource.kind === "mask") {
        const names = new Set<string>();
        for (const shape of resource.shapes) {
          if (names.has(shape.id)) throw new Error("Duplicate mask shape id");
          names.add(shape.id);
          validateShape(shape, resources, true);
        }
      } else if (resource.kind === "linearGradient") {
        if (
          ![resource.x1, resource.x2, resource.y1, resource.y2].every(
            Number.isFinite,
          ) ||
          resource.stops.length < 2 ||
          resource.stops.some(
            (s) =>
              !Number.isFinite(s.offset) ||
              s.offset < 0 ||
              s.offset > 1 ||
              !/^#[\da-f]{6}$/i.test(s.color),
          )
        )
          throw new Error("Invalid gradient");
      } else throw new Error("Unsupported SVG resource");
    }
    const box = frame.viewBox ?? { x: 0, y: 0, width: 320, height: 320 };
    if (
      !Object.values(box).every(Number.isFinite) ||
      box.width <= 0 ||
      box.height <= 0
    )
      throw new Error("Invalid viewBox");
    svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
    const fragment = document.createDocumentFragment();
    for (const resource of resources.values()) {
      const node = document.createElementNS(NS, resource.kind);
      node.id = localId(resource.id);
      if (resource.kind === "mask") {
        node.setAttribute("maskUnits", "userSpaceOnUse");
        node.setAttribute("maskContentUnits", "userSpaceOnUse");
        for (const [key, value] of Object.entries(box))
          node.setAttribute(key, String(value));
        for (const shape of resource.shapes) {
          const child = document.createElementNS(NS, shape.kind);
          paint(child, shape);
          node.append(child);
        }
      } else {
        node.setAttribute("gradientUnits", "userSpaceOnUse");
        for (const key of ["x1", "y1", "x2", "y2"] as const)
          node.setAttribute(key, String(resource[key]));
        for (const stop of resource.stops) {
          const child = document.createElementNS(NS, "stop");
          child.setAttribute("offset", String(stop.offset));
          child.setAttribute("stop-color", stop.color);
          node.append(child);
        }
      }
      fragment.append(node);
    }
    defs.replaceChildren(fragment);
    for (const [i, shape] of frame.shapes.entries()) {
      let node = nodes.get(shape.id);
      if (!node || node.tagName !== shape.kind) {
        node?.remove();
        node = document.createElementNS(NS, shape.kind);
        nodes.set(shape.id, node);
      }
      paint(node, shape);
      const expected = body.children[i];
      if (expected !== node) body.insertBefore(node, expected ?? null);
    }
    for (const [id, node] of nodes)
      if (!ids.has(id)) {
        node.remove();
        nodes.delete(id);
      }
    currentFrame = frame;
    debugLayer.replaceChildren();
    if (debug) renderMountDebug(debugLayer, frame);
  }
  return {
    svg,
    render,
    hitTest(clientX: number, clientY: number): import('./clicks.js').ClickHit {
      const area = currentFrame?.hitArea;
      const shape = area ? nodes.get(area.shape) as SVGGeometryElement | undefined : undefined;
      const bounds = svg.getBoundingClientRect();
      const outside = { region: 'outside', point: {
        x: Math.max(-1,Math.min(1,2*(clientX-bounds.left)/Math.max(1,bounds.width)-1)),
        y: Math.max(-1,Math.min(1,2*(clientY-bounds.top)/Math.max(1,bounds.height)-1)),
      }};
      if (!shape || Number(shape.getAttribute('opacity') ?? 1) < .1) return outside;
      const matrix = shape.getScreenCTM();
      if (!matrix) return outside;
      const local = new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse());
      if (!shape.isPointInFill(local)) return outside;
      const box = shape.getBBox();
      const x = (local.x-box.x)/Math.max(.001,box.width), y = (local.y-box.y)/Math.max(.001,box.height);
      const region = area!.regions.find(r => x>=r.x && y>=r.y && x<=r.x+r.width && y<=r.y+r.height);
      return { region: region?.id ?? 'body', point: {x:x*2-1,y:y*2-1} };
    },
    setDebug(value: boolean) {
      debug = value;
    },
    destroy() {
      if (dead) return;
      dead = true;
      svg.remove();
      nodes.clear();
    },
  };
}
