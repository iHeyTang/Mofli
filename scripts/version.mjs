import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { releasePackages, validateVersions } from "./release-model.mjs";

execFileSync("npm", ["exec", "--", "changeset", "version"], {
  stdio: "inherit",
});
const packages = releasePackages();
const version = packages[0].version;
if (packages.some((p) => p.version !== version))
  throw new Error("Changesets fixed group produced different versions");
const names = new Set(packages.map((p) => p.name));
for (const file of [
  "package.json",
  ...packages.map((p) => `${p.path}/package.json`),
]) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  manifest.version = version;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"])
    for (const name of Object.keys(manifest[field] ?? {}))
      if (names.has(name)) manifest[field][name] = `^${version}`;
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}
validateVersions(releasePackages(), version);
execFileSync(
  "npm",
  [
    "install",
    "--package-lock-only",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  { stdio: "inherit" },
);
