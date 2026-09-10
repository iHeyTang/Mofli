import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { libraryPackages } from "./package-graph.mjs";
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "mofli-packages-"));
const packages = libraryPackages(root);
const tarballs = new Map();
const manifests = new Map(packages.map((p) => [p.manifest.name, p.manifest]));
function verifyPack(packed, manifest) {
  const paths = new Set(packed.files.map((file) => file.path));
  for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md", "README.md"])
    if (!paths.has(file)) throw new Error(`${manifest.name}: missing ${file}`);
  if (manifest.private || manifest.license !== "MIT" || manifest.publishConfig?.access !== "public")
    throw new Error(`${manifest.name}: package is not configured for public MIT distribution`);
  function checkTarget(value) {
    if (typeof value === "string") {
      const target = value.replace(/^\.\//, "");
      if (!target.includes("*") && !paths.has(target))
        throw new Error(`${manifest.name}: missing exported file ${target}`);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) checkTarget(child);
    }
  }
  if (manifest.repository?.url !== "git+https://github.com/iHeyTang/Mofli.git" || !manifest.repository?.directory || manifest.homepage !== "https://github.com/iHeyTang/Mofli#readme" || manifest.bugs?.url !== "https://github.com/iHeyTang/Mofli/issues")
    throw new Error(`${manifest.name}: missing GitHub package metadata`);
  checkTarget(manifest.exports);
  checkTarget(manifest.bin);
}
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "pipe" }).toString();
function install(project, manifest, { libraryBuild = false } = {}) {
  manifest = structuredClone(manifest);
  // Bootstrap libraries before packing their Studio development tool.
  if (libraryBuild) delete manifest.devDependencies?.["@mofli/studio"];
  // Replace only internal package versions with packed artifacts. Keep every
  // external dependency/devDependency as declared, including the local toolchain.
  const closure = new Set();
  function visit(m) {
    for (const dep of Object.keys({
      ...m.dependencies,
      ...m.peerDependencies,
      ...m.devDependencies,
    })) {
      if (!manifests.has(dep) || closure.has(dep)) continue;
      closure.add(dep);
      visit(manifests.get(dep));
    }
  }
  visit(manifest);
  const m = structuredClone(manifest);
  for (const field of ["dependencies", "peerDependencies", "devDependencies"])
    for (const dep of Object.keys(m[field] ?? {}))
      if (tarballs.has(dep)) m[field][dep] = `file:${tarballs.get(dep)}`;
  // Supply transitive workspace peers without reaching an unpublished registry.
  m.devDependencies ??= {};
  for (const dep of closure)
    m.devDependencies[dep] = `file:${tarballs.get(dep)}`;
  writeFileSync(join(project, "package.json"), JSON.stringify(m, null, 2));
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
    ],
    project,
  );
}
try {
  for (const { path, manifest } of packages) {
    const isolated = join(temp, manifest.name.replace("@mofli/", ""));
    cpSync(path, isolated, {
      recursive: true,
      filter: (source) =>
        !["node_modules", "dist"].includes(source.split("/").at(-1)),
    });
    install(isolated, manifest, { libraryBuild: true });
    run("npm", ["run", "build"], isolated);
    run("npm", ["run", "typecheck"], isolated);
    // Pack the independently built output using its original dependency manifest.
    writeFileSync(
      join(isolated, "package.json"),
      JSON.stringify(manifest, null, 2),
    );
    const packed = JSON.parse(
      run("npm", ["pack", "--json", "--pack-destination", temp], isolated),
    )[0];
    verifyPack(packed, manifest);
    if (packed.files.some((f) => f.path.includes("node_modules")))
      throw new Error("Bundled node_modules");
    tarballs.set(manifest.name, join(temp, packed.filename));
    console.log(
      `${manifest.name}: isolated install, build, typecheck and pack OK`,
    );
  }
  const consumer = join(temp, "consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      ...tarballs.values(),
    ],
    consumer,
  );
  writeFileSync(join(consumer,'smoke.mjs'),`
import assert from 'node:assert/strict';
import {PetEngine,PetRegistry} from '@mofli/core';
import {grovePack,defineBloubSkin,bloubRig} from '@mofli/grove';
assert.equal(grovePack.rigs.length,2);assert.equal(grovePack.skins.length,6);assert.equal(grovePack.attachments.length,20);
const registry=new PetRegistry().registerPacks(grovePack);
for(const skin of grovePack.skins)assert.ok(registry.create({version:1,skin,rigConfig:{},pose:{},attachments:[]}).sample(.75).shapes.length);
const custom=defineBloubSkin({id:'consumer-custom',name:'Custom',colors:{body:'#567856'}});
assert.ok(new PetEngine(bloubRig,custom).sample(0).shapes.length);
assert.throws(()=>import.meta.resolve('@mofli/core/rigs'));
`);
  run(process.execPath,['smoke.mjs'],consumer);
  console.log('Packed Grove collection: all resources and extension factories OK');
  const studio = join(temp, "studio");
  cpSync(join(root, "apps/studio"), studio, {
    recursive: true,
    filter: (source) =>
      !["node_modules", "dist"].includes(source.split("/").at(-1)),
  });
  install(
    studio,
    JSON.parse(readFileSync(join(studio, "package.json"), "utf8")),
  );
  run("npm", ["run", "typecheck"], studio);
  run("npm", ["run", "build"], studio);
  for (const page of ["index.html"])
    readFileSync(join(studio, "dist", page));
  console.log(
    "@mofli/studio: isolated install, typecheck and production build OK",
  );
  const studioManifest = JSON.parse(
    readFileSync(join(root, "apps/studio/package.json"), "utf8"),
  );
  writeFileSync(
    join(studio, "package.json"),
    JSON.stringify(studioManifest, null, 2),
  );
  const packedStudio = JSON.parse(
    run("npm", ["pack", "--json", "--pack-destination", temp], studio),
  )[0];
  verifyPack(packedStudio, studioManifest);
  const studioTarball = join(temp, packedStudio.filename);
  tarballs.set(studioManifest.name, studioTarball);
  manifests.set(studioManifest.name, studioManifest);
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      studioTarball,
    ],
    consumer,
  );
  const groveProject = join(temp, "grove");
  install(groveProject, manifests.get("@mofli/grove"));
  run("npm", ["run", "check"], groveProject);
  console.log("Grove source project: packed Studio loads and validates mofli.project.ts OK");
  const cli = join(consumer, "node_modules/@mofli/studio/bin/mofli.mjs");
  const help=run("npm",["exec","--offline","--","mofli","--help"],consumer);
  if(!help.includes("mofli init"))throw new Error("Packed npm CLI launcher failed");
  for (const type of ["skin", "attachment", "pack"]) {
    const dir = join(temp, "creator-" + type);
    run(
      process.execPath,
      [cli, "init", dir, "--type", type, "--no-install"],
      consumer,
    );
    install(dir, JSON.parse(readFileSync(join(dir, "package.json"), "utf8")));
    run("npm", ["run", "check"], dir);
    if (type === "skin") {
      writeFileSync(
        join(dir, "save.mjs"),
        `import {skin} from './dist/index.js';import {writeFileSync} from 'node:fs';writeFileSync('pet.json',JSON.stringify({version:1,skin,rigConfig:{},pose:{},attachments:[]}));`,
      );
      run(process.execPath, ["save.mjs"], dir);
      run(process.execPath, [cli, "export", "pet.json"], dir);
      for (const file of [
        "pet.mjs",
        "pet.d.ts",
        "pet.json",
        "package.json",
        "THIRD_PARTY_NOTICES.md",
      ])
        readFileSync(join(dir, "pet-runtime", file));
    }
    console.log(
      `Packed CLI: ${type} scaffold, install, build and validation OK`,
    );
  }
} catch (error) {
  console.error(error.stdout?.toString() ?? "", error.stderr?.toString() ?? "");
  throw error;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
