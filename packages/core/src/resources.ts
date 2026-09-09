import type { Shape } from "./index.js";
/** Instance-local resource names, resolved exclusively by the renderer. */
export type SvgResource =
  | { id: string; kind: "mask"; shapes: Shape[] }
  | {
      id: string;
      kind: "linearGradient";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stops: { offset: number; color: string }[];
    };
