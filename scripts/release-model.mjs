import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const packagePaths = ["packages/core", "packages/grove", "apps/studio"];

export function releasePackages(root = process.cwd()) {
  return packagePaths.map((path) => ({
    path,
    ...JSON.parse(readFileSync(resolve(root, path, "package.json"), "utf8")),
  }));
}

export function validateVersions(packages, rootVersion) {
  const version = packages[0].version;
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("This workflow only publishes stable versions");
  if (rootVersion !== version || packages.some((p) => p.version !== version))
    throw new Error("Root, Core, Grove and Studio versions must match");
  const names = new Set(packages.map((p) => p.name));
  for (const p of packages) {
    if (p.private || p.publishConfig?.access !== "public")
      throw new Error(`${p.name} is not a public release package`);
    for (const field of ["dependencies", "devDependencies", "peerDependencies"])
      for (const [name, range] of Object.entries(p[field] ?? {}))
        if (names.has(name) && range !== `^${version}`)
          throw new Error(`${p.name}: ${name} must use ^${version}`);
  }
  return version;
}

export function changelogEntry(text, version) {
  return text
    .split(/^## /m)
    .slice(1)
    .find((section) => section.split(/\r?\n/, 1)[0].trim() === version)
    ?.split(/\r?\n/)
    .slice(1)
    .join("\n")
    .trim();
}

// Keep dependent packages unavailable until the preceding package is visible.
// Existing versions are skipped so a partially completed release can be rerun.
export async function publishInOrder(packages, { exists, publish, wait }) {
  for (const p of packages) {
    if (!(await exists(p))) await publish(p);
    await wait(p);
  }
}
