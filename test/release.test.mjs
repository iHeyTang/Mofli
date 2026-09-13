import test from "node:test";
import assert from "node:assert/strict";
import {
  changelogEntry,
  publishInOrder,
  validateVersions,
} from "../scripts/release-model.mjs";

const packages = ["core", "grove", "studio"].map((name) => ({
  name: `@mofli/${name}`,
  version: "0.2.1",
  publishConfig: { access: "public" },
}));

test("release refuses mismatched versions and stale internal dependency ranges", () => {
  assert.equal(validateVersions(packages, "0.2.1"), "0.2.1");
  assert.throws(() => validateVersions(packages, "0.2.0"), /must match/);
  assert.throws(
    () =>
      validateVersions(
        [packages[0], { ...packages[1], version: "0.3.0" }],
        "0.2.1",
      ),
    /must match/,
  );
  assert.throws(
    () =>
      validateVersions(
        [
          packages[0],
          { ...packages[1], dependencies: { "@mofli/core": "^0.2.0" } },
        ],
        "0.2.1",
      ),
    /must use/,
  );
});

test("retry skips published packages and waits for each dependency before proceeding", async () => {
  const calls = [];
  await publishInOrder(packages, {
    exists: async (p) => p.name === "@mofli/core",
    publish: async (p) => calls.push(`publish ${p.name}`),
    wait: async (p) => calls.push(`wait ${p.name}`),
  });
  assert.deepEqual(calls, [
    "wait @mofli/core",
    "publish @mofli/grove",
    "wait @mofli/grove",
    "publish @mofli/studio",
    "wait @mofli/studio",
  ]);
});

test("failed publication or propagation stops dependent publications", async () => {
  for (const stage of ["publish", "wait"]) {
    const calls = [];
    await assert.rejects(
      publishInOrder(packages, {
        exists: async () => false,
        publish: async (p) => {
          calls.push(p.name);
          if (stage === "publish") throw new Error("unavailable");
        },
        wait: async () => {
          throw new Error("unavailable");
        },
      }),
      /unavailable/,
    );
    assert.deepEqual(calls, ["@mofli/core"]);
  }
});

test("release notes contain only the exact current version, including dependency-only entries", () => {
  const log =
    "# @mofli/core\n\n## 0.2.10\n\n### Patch Changes\n\n- New fix\n\n## 0.2.1\n\n### Patch Changes\n\n- Updated dependencies\n\n## 0.2.0\n\nOld release\n";
  assert.equal(
    changelogEntry(log, "0.2.1"),
    "### Patch Changes\n\n- Updated dependencies",
  );
  assert.equal(changelogEntry(log, "0.3.0"), undefined);
  assert.equal(changelogEntry("# @mofli/core\n\n## 0.2.1\n", "0.2.1"), "");
});
