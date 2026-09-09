/** Test-only equivalent of upstream BloubBot.vue SVG markup.
 * Oracle deliberately bypasses Mofli Frame conversion and SVG renderer.
 * Upstream source and MIT attribution: THIRD_PARTY_NOTICES.md.
 */
import type { BotFrame } from "../../packages/rig-bloub/src/vendor/engine.js";
import { mixHex } from "../../packages/rig-bloub/src/vendor/skins.js";
export function originalSvg(f: BotFrame, id: string) {
  const ink = "#0a0a0c",
    paper = "#f9f9f9";
  const dot = (p: BotFrame["dots"][number]) => {
    const fill =
      p.color ?? (p.depth === undefined ? ink : mixHex(paper, ink, p.depth));
    return p.d
      ? `<path d="${p.d}" fill="${fill}" opacity="${p.opacity}" transform="translate(${p.x} ${p.y}) rotate(${p.rot ?? 0}) scale(100)"/>`
      : `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${fill}" opacity="${p.opacity}"/>`;
  };
  const arc = (side: "front" | "back") =>
    `<g fill="none" stroke-linecap="round">${f.arcs.map((a, i) => `<path d="${a[side]}" stroke="url(#${id}-${i})" stroke-width="${a.width}" opacity="${a.opacity}"/>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="316" height="316" viewBox="-158 -158 316 316"><defs><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="-158" y="-158" width="316" height="316"><path d="${f.bodyPath}" fill="#fff"/>${f.eyes.map((e) => `<path d="${e.d}" transform="${e.matrix}" opacity="${e.alpha}" fill="#000"/>`).join("")}${f.notch ? `<circle cx="${f.notch.x}" cy="${f.notch.y}" r="${f.notch.r}" fill="#000"/>` : ""}</mask>${f.arcs.map((a, i) => `<linearGradient id="${id}-${i}" gradientUnits="userSpaceOnUse" x1="${a.grad.x1}" y1="${a.grad.y1}" x2="${a.grad.x2}" y2="${a.grad.y2}">${a.grad.stops.map((c, j) => `<stop offset="${j / (a.grad.stops.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>`).join("")}</defs>${arc("back")}${f.dotsBehind ? f.dots.map(dot).join("") : ""}<g opacity="${f.bodyAlpha}"><path d="${f.bodyPath}" fill="${paper}"/><g mask="url(#${id}-mask)"><rect x="-158" y="-158" width="316" height="316" fill="${ink}"/></g></g>${!f.dotsBehind ? f.dots.map(dot).join("") : ""}${f.notif ? `<circle cx="${f.notif.x}" cy="${f.notif.y}" r="${f.notif.r}" fill="#2496e8"/>` : ""}${arc("front")}</svg>`;
}
