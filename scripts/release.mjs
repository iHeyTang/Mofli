import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import {
  releasePackages,
  validateVersions,
  changelogEntry,
  publishInOrder,
} from "./release-model.mjs";

const packages = releasePackages();
const root = JSON.parse(readFileSync("package.json", "utf8"));
const version = validateVersions(packages, root.version);
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const p of [{ path: "", ...root }, ...packages]) {
  const entry = lock.packages[p.path];
  if (entry?.version !== version)
    throw new Error(`${p.name}: stale lockfile version`);
  for (const field of ["dependencies", "devDependencies", "peerDependencies"])
    if (!isDeepStrictEqual(entry[field] ?? {}, p[field] ?? {}))
      throw new Error(`${p.name}: stale lockfile ${field}`);
}
if (process.argv.includes("--check")) {
  console.log(`Release versions and lockfile agree: ${version}`);
  process.exit(0);
}
if (process.argv.length !== 2)
  throw new Error("Usage: node scripts/release.mjs [--check]");
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.GITHUB_REPOSITORY !== "iHeyTang/Mofli" ||
  process.env.GITHUB_REF !== "refs/heads/main"
)
  throw new Error(
    "Publish must run in iHeyTang/Mofli's main-branch GitHub Actions workflow",
  );
if (
  readdirSync(".changeset").some((f) => f.endsWith(".md") && f !== "README.md")
)
  throw new Error("Merge the version PR before publishing pending changesets");

const registry = "https://registry.npmjs.org";
async function json(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { "cache-control": "no-cache" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
const metadata = (p) =>
  json(`${registry}/${encodeURIComponent(p.name)}/${p.version}`);
const current = await Promise.all(packages.map(metadata));
const notes = packages.map((p) => {
  const file = `${p.path}/CHANGELOG.md`;
  return existsSync(file)
    ? changelogEntry(readFileSync(file, "utf8"), version)
    : undefined;
});
// The existing 0.2.0 release predates Changesets. Installing the workflow alone
// must neither republish it nor invent release notes for it.
if (notes.every((note) => note === undefined) && current.every(Boolean)) {
  console.log(
    `All packages already published at ${version}; no release notes to publish`,
  );
  process.exit(0);
}
if (notes.some((note) => note === undefined))
  throw new Error("Every package needs a changelog entry for this release");
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { stdio: "inherit", ...options });
const head = run(
  "gh",
  ["api", "repos/iHeyTang/Mofli/commits/main", "--jq", ".sha"],
  { encoding: "utf8", stdio: "pipe" },
).trim();
if (head !== process.env.GITHUB_SHA)
  throw new Error("This run is stale; rerun Release against current main");
for (const p of packages) {
  const latest = await json(`${registry}/${encodeURIComponent(p.name)}/latest`);
  if (!latest) continue;
  const a = latest.version.split(".").map(Number);
  const b = version.split(".").map(Number);
  const first = a.findIndex((n, i) => n !== b[i]);
  if (first >= 0 && a[first] > b[first])
    throw new Error(
      `${p.name}: refusing to move latest backwards from ${latest.version}`,
    );
}
await publishInOrder(packages, {
  exists: async (p) => Boolean(await metadata(p)),
  publish: async (p) =>
    run("npm", [
      "publish",
      "--workspace",
      p.name,
      "--registry",
      registry,
      "--access",
      "public",
      "--tag",
      "latest",
    ]),
  wait: async (p) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const data = await metadata(p);
      if (data?.dist?.tarball) {
        const response = await fetch(data.dist.tarball, {
          method: "HEAD",
          signal: AbortSignal.timeout(30_000),
        });
        if (response.ok) {
          console.log(`${p.name}@${version} is available`);
          return;
        }
        if (response.status !== 404)
          throw new Error(`Tarball check: HTTP ${response.status}`);
      }
      console.log(
        `Waiting for npm to make ${p.name}@${version} available (${attempt + 1}/60)`,
      );
      await sleep(10_000);
    }
    throw new Error(
      `${p.name}: npm propagation timed out; rerun this workflow to resume`,
    );
  },
});
const temp = mkdtempSync(join(tmpdir(), "mofli-release-"));
try {
  run(
    "npm",
    [
      "exec",
      "--yes",
      `--registry=${registry}`,
      `--package=@mofli/studio@${version}`,
      "--",
      "mofli",
      "--help",
    ],
    { cwd: temp },
  );
  const tag = `v${version}`;
  // An API 404 means absent; authentication/network failures must stop the run.
  const response = await fetch(
    `https://api.github.com/repos/iHeyTang/Mofli/releases/tags/${tag}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (response.status === 404) {
    const file = join(temp, "release-notes.md");
    writeFileSync(
      file,
      packages
        .map(
          (p, i) =>
            `## ${p.name}@${version}\n\n${notes[i] || "Version synchronized with the Mofli release group."}`,
        )
        .join("\n\n"),
    );
    run("gh", [
      "release",
      "create",
      tag,
      "--repo",
      "iHeyTang/Mofli",
      "--target",
      process.env.GITHUB_SHA,
      "--title",
      `Mofli ${version}`,
      "--notes-file",
      file,
    ]);
  } else if (!response.ok)
    throw new Error(`GitHub release lookup: HTTP ${response.status}`);
  console.log(`Release complete: ${tag}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
