import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
export function scaffold(
  target,
  { type = "skin", rig = "bloub", version = "0.1.0" } = {},
) {
  if (!["skin", "attachment", "pack"].includes(type))
    throw new Error("--type must be skin, attachment or pack");
  if (!["bloub", "cat-head"].includes(rig))
    throw new Error("--rig must be bloub or cat-head");
  const dir = resolve(target),
    id = basename(dir);
  if (!/^[a-z][a-z0-9-]{0,49}$/.test(id))
    throw new Error("Use a lowercase directory name, e.g. my-skin");
  if (existsSync(dir))
    throw new Error("Destination already exists; choose a new directory");
  const rigPackage = "@mofli/grove/rigs/" + rig;
  const rigExport = rig === "bloub" ? "bloubRig" : "catHeadRig",
    factory = rig === "bloub" ? "defineBloubSkin" : "defineCatSkin";
  const source =
    type === "pack"
      ? `import {defineResourcePack,defineAttachment} from '@mofli/core';
import {bloubRig,defineBloubSkin} from '@mofli/grove/rigs/bloub';
import {catHeadRig,defineCatSkin} from '@mofli/grove/rigs/cat-head';
const gem=defineAttachment({id:'${id}-gem',mount:'head.forehead',slot:'head.overlay',scene:{version:1,nodes:[{id:'gem',geometry:{kind:'ellipse',cx:0,cy:0,rx:.15,ry:.18},attrs:{fill:'#dfcdab'}}]}});
export const pack=defineResourcePack({id:'${id}',version:1,rigs:[bloubRig,catHeadRig],skins:[defineBloubSkin({id:'${id}-blob',name:'Soft blob',colors:{body:'#536852'}}),defineCatSkin({id:'${id}-cat',name:'Soft cat',colors:{body:'#536852'}})],attachments:[{name:'Soft gem',attachment:gem}]});
export default pack;
`
      : type === "skin"
        ? `import {${rigExport},${factory}} from '${rigPackage}';
export const skin=${factory}({id:'${id}',name:'${id}',colors:{body:'#536852'}});
export const pet={rig:${rigExport},skin};
`
        : `import {defineAttachment} from '@mofli/core';
// Local coordinates use head radii. Core projects the path through the rig mount.
export const attachment=defineAttachment({
 id:'${id}',mount:'head.lower.front',slot:'head.overlay',
 parameters:{size:{min:.6,max:1.4,default:1}},scaleParameter:'size',
 scene:{version:1,nodes:[{
  id:'gem',geometry:{kind:'ellipse',cx:0,cy:0,rx:.28,ry:.21},
  attrs:{fill:'#c38a64'},
 }]},
});
`;
  const project =
    type === "pack"
      ? `import {pack} from './src/index.js';
export default {packs:[pack],defaultSkin:'${id}-blob'};
`
      : type === "skin"
        ? `import {pet} from './src/index.js';
export default {pets:[pet],defaultSkin:pet.skin.id};
`
        : `import {attachment} from './src/index.js';
export default {attachments:[{name:'${id}',attachment}],defaultAttachments:[attachment.id]};
`;
  const manifest = {
    name: id,
    version: "0.1.0",
    private: true,
    type: "module",
    files: ["dist", "README.md"],
    exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } },
    scripts: {
      dev: "mofli dev",
      "export:pet": "mofli export",
      build: "tsc -p tsconfig.json",
      check: "npm run build && mofli check",
      prepack: "npm run build",
    },
    peerDependencies:
      type === "pack"
        ? {
            "@mofli/core": "^" + version,
            "@mofli/grove": "^" + version,
          }
        : {
            [type === "skin" ? "@mofli/grove" : "@mofli/core"]: "^" + version,
          },
    devDependencies: { "@mofli/studio": "^" + version, typescript: "~5.9.3" },
  };
  mkdirSync(resolve(dir, "src"), { recursive: true });
  const files = {
    "package.json": JSON.stringify(manifest, null, 2),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          declaration: true,
          outDir: "dist",
          rootDir: "src",
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
    "src/index.ts": source,
    "mofli.project.ts": project,
    ".gitignore": "node_modules/\ndist/\n*.tgz\npet-runtime/\n",
    "README.md": `# ${id}

Run npm run dev, edit src/index.ts, and preview in Studio. Save a complete pet JSON from Studio.

Validate: npm run check

Export an embeddable runtime: npx mofli export ./my-pet.pet.json --out ./pet-runtime

Build and inspect this independent package: npm pack --dry-run

The source package is private until you choose its npm name, license and publication policy. Studio is a development dependency only.
`,
  };
  for (const [name, content] of Object.entries(files))
    writeFileSync(resolve(dir, name), content + "\n");
  return dir;
}
