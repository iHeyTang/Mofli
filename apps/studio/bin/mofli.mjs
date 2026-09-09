#!/usr/bin/env node
import {resourcesFor} from '../resources.js';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { registryFor } from "./registry.mjs";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createServer, build, searchForWorkspaceRoot } from "vite";
import { scaffold } from "./scaffold.mjs";
import { projectPlugin } from "./project-plugin.mjs";
const studio = fileURLToPath(new URL("../", import.meta.url));
const version = JSON.parse(
  readFileSync(join(studio, "package.json"), "utf8"),
).version;
const args = process.argv.slice(2);
const command =
  !args.length ||
  (args[0].startsWith("--") && !["--help", "--version"].includes(args[0]))
    ? "dev"
    : args.shift();
function option(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const v = args[i + 1];
  if (!v || v.startsWith("--")) throw new Error("Missing value for " + name);
  args.splice(i, 2);
  return v;
}
function flag(name) {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}
function config(root, withProject = true) {
  return {
    configFile: false,
    root: studio,
    plugins: [
      react(),
      tailwindcss(),
      ...(withProject ? [projectPlugin(root)] : []),
    ],
    server: {
      host: "127.0.0.1",
      fs: { allow: [searchForWorkspaceRoot(studio), root] },
    },
    optimizeDeps: {
      exclude: ["@mofli/core", "@mofli/grove/rigs/bloub", "@mofli/grove/rigs/cat-head"],
    },
  };
}
async function load(root) {
  if (!existsSync(join(root, "mofli.project.ts")))
    throw new Error(
      "Missing mofli.project.ts. Run mofli init first, or use --project <directory>.",
    );
  const server = await createServer({
    ...config(root),
    server: { ...config(root).server, middlewareMode: true },
  });
  try {
    return {
      project: (await server.ssrLoadModule(join(root, "mofli.project.ts")))
        .default,
      server,
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}

try {
  if (command === "--version") {
    console.log(version);
  } else if (command === "help" || command === "--help") {
    console.log(
      `Mofli ${version}\n\nmofli init <directory> [--type skin|attachment|pack] [--rig bloub|cat-head] [--no-install]\nmofli dev [--project directory] [--port 4173]\nmofli check [pet.json] [--project directory]\nmofli export <pet.json> [--out pet-runtime] [--project directory]\n\nEdit src/index.ts; Studio reloads your project. Export JSON in Studio, then export a runtime module here.`,
    );
  } else if (command === "init") {
    const type = option("--type", "skin"),
      rig = option("--rig", "bloub"),
      skip = flag("--no-install");
    if (args.length !== 1)
      throw new Error("Usage: mofli init <directory> --type skin|attachment|pack");
    const dir = scaffold(args[0], { type, rig, version });
    console.log("Created " + dir);
    if (!skip) {
      const r = spawnSync(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["install"],
        { cwd: dir, stdio: "inherit" },
      );
      if (r.error || r.status !== 0)
        throw new Error(
          "Installation failed. Project files remain; run npm install in " +
            dir,
        );
    }
    console.log(
      `\nNext:\n  cd ${JSON.stringify(args[0])}\n  ${skip ? "npm install\n  " : ""}npm run dev`,
    );
  } else if (["dev", "check", "export"].includes(command)) {
    const explicitProject = args.includes("--project");
    const root = resolve(option("--project", process.cwd()));
    if (command === "dev") {
      const port = Number(option("--port", "4173"));
      if (args.length || !Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error("Invalid dev arguments");
      const withProject = existsSync(join(root, "mofli.project.ts"));
      if (explicitProject && !withProject)
        throw new Error("Missing mofli.project.ts in " + root);
      const c = config(withProject ? root : studio, withProject);
      const server = await createServer({
        ...c,
        server: { ...c.server, port, strictPort: true },
      });
      await server.listen();
      console.log("Mofli Studio · " + (withProject ? root : "内置工作台"));
      server.printUrls();
      for (const signal of ["SIGINT", "SIGTERM"])
        process.once(signal, async () => {
          await server.close();
          process.exit(0);
        });
    } else {
      const out = resolve(root, option("--out", "pet-runtime"));
      if (args.length > 1) throw new Error("Provide a pet JSON file");
      const { project, server } = await load(root);
      try {
        const registry = await registryFor(project);
        let petConfig;
        if (
          !args[0] &&
          (command === "export" || existsSync(join(root, "pet.json")))
        )
          args.push("pet.json");
        if (args[0])
          petConfig = registry.resolve(
            JSON.parse(readFileSync(resolve(root, args[0]), "utf8")),
          ).config;
        {
          for (const skin of resourcesFor(project).skins)
            registry
              .create({
                version: 1,
                skin,
                rigConfig: {},
                pose: {},
                attachments: [],
              })
              .sample(1, true);
          const { bloubSkin } = await import("@mofli/grove/skins/bloub");
          for (const { attachment } of resourcesFor(project).attachments) {
            const resources=resourcesFor(project);
            const compatibleRig=resources.rigs.find(r=>r.mounts?.[attachment.mount]);
            const compatible=resources.skins.find(s=>s.rig===compatibleRig?.id);
            registry
              .create({
                version: 1,
                skin: compatible ?? bloubSkin,
                rigConfig: {},
                pose: {},
                attachments: [
                  { id: attachment.id, type: attachment.id, version: 1 },
                ],
              })
              .sample(1, true);
          }
        }
        if (command === "check")
          console.log(
            "Validated project" +
              (petConfig ? " and complete pet configuration" : "") +
              ".",
          );
        else {
          if (existsSync(out))
            throw new Error("Output directory already exists: " + out);
          const source = `import project from ${JSON.stringify(join(root, "mofli.project.ts"))};
import {PetRegistry} from '@mofli/core';import {createPet} from '@mofli/core/browser';
import {resourcesFor} from ${JSON.stringify(join(studio,'resources.js'))};
const registry=new PetRegistry().registerPacks({id:'exported',version:1,...resourcesFor(project)});
export const config=${JSON.stringify(petConfig)};
export function mountPet(container,options={}){return createPet({...options,container,registry,config});}`;
          await build({
            configFile: false,
            root: studio,
            plugins: [
              {
                name: "mofli-runtime",
                resolveId(id) {
                  if (id.endsWith("virtual:mofli-runtime"))
                    return "\0mofli-runtime";
                },
                load(id) {
                  if (id === "\0mofli-runtime") return source;
                },
              },
            ],
            build: {
              outDir: out,
              emptyOutDir: false,
              lib: {
                entry: "virtual:mofli-runtime",
                formats: ["es"],
                fileName: () => "pet.mjs",
              },
              minify: true,
            },
          });
          writeFileSync(
            join(out, "pet.json"),
            JSON.stringify(petConfig, null, 2),
          );
          writeFileSync(
            join(out, "package.json"),
            JSON.stringify(
              {
                name: petConfig.skin.id + "-pet-runtime",
                version: "0.1.0",
                private: true,
                type: "module",
                files: [
                  "pet.mjs",
                  "pet.d.ts",
                  "pet.json",
                  "README.md",
                  "THIRD_PARTY_NOTICES.md",
                ],
                exports: { ".": { types: "./pet.d.ts", import: "./pet.mjs" } },
              },
              null,
              2,
            ),
          );
          writeFileSync(
            join(out, "pet.d.ts"),
            `export declare const config: {version:1;skin:unknown;rigConfig:Record<string,number>;pose:Record<string,number>;attachments:unknown[]};
export declare function mountPet(container:HTMLElement,options?:{debug?:boolean;reducedMotion?:boolean}):{
 destroy():void;setPaused(value:boolean):void;setDebug(value:boolean):void;setSkin(value:unknown):void;
 setPose(value:Record<string,number>):void;setRigConfig(value:Record<string,number>):void;
 setMood(value:'calm'|'curious'|'happy'):void;
 setActivity(value:'idle'|'working'|'waiting'|'success'):void;
 exportConfig():typeof config;getSkin():unknown;
};`,
          );
          const notice = join(
            dirname(fileURLToPath(import.meta.resolve("@mofli/core"))),
            "../THIRD_PARTY_NOTICES.md",
          );
          writeFileSync(
            join(out, "THIRD_PARTY_NOTICES.md"),
            readFileSync(notice, "utf8"),
          );

          writeFileSync(
            join(out, "README.md"),
            'Import { mountPet } from "./pet.mjs"; then call mountPet(container). Set container width/height. Call returned destroy() on unmount. No Studio or framework runtime is required.\n',
          );
          writeFileSync(
            join(out, "index.html"),
            '<meta name="viewport" content="width=device-width"><div id="pet" style="width:320px;height:320px"></div><script type="module">import {mountPet} from "./pet.mjs";mountPet(document.querySelector("#pet"));</script>',
          );
          console.log("Exported runtime: " + out);
        }
      } finally {
        await server.close();
      }
    }
  } else throw new Error("Unknown command: " + command + ". Run mofli --help");
} catch (error) {
  console.error("Mofli: " + error.message);
  process.exitCode = 1;
}
