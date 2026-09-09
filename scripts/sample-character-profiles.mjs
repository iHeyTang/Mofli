// Run from the workspace root to resample the approved static SVG masters.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("examples/studio/character.js", "utf8");
const paths = [...src.matchAll(/"(M [^"]+ Z)"/g)].map((m) => m[1]);
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage();
const out = await p.evaluate(
  (paths) =>
    paths.map((d) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      const len = path.getTotalLength();
      const pts = Array.from({ length: 2048 }, (_, i) => {
        const q = path.getPointAtLength((i / 2048) * len);
        return { x: (q.x - 128) / 85, y: (q.y - 150) / 85 };
      });
      return Array.from({ length: 64 }, (_, i) => {
        const x = Math.cos((i / 64) * 2 * Math.PI),
          y = Math.sin((i / 64) * 2 * Math.PI);
        let nearest = Infinity;
        for (let j = 0; j < pts.length; j++) {
          const a = pts[j],
            b = pts[(j + 1) % pts.length],
            vx = b.x - a.x,
            vy = b.y - a.y,
            den = x * vy - y * vx;
          if (Math.abs(den) < 1e-9) continue;
          const t = (a.x * vy - a.y * vx) / den,
            u = (a.x * y - a.y * x) / den;
          if (t > 0 && u >= 0 && u <= 1) nearest = Math.min(nearest, t);
        }
        return +nearest.toFixed(5);
      });
    }),
  [paths[0], paths[3], paths[6]],
);
await b.close();
writeFileSync(
  "packages/rig-bloub/src/character-profiles.ts",
  "/** 64-angle samples of the approved Mofli SVG study masters, centered at (128,150). */\nexport const characterProfiles = " +
    JSON.stringify(out) +
    ";\n",
);
