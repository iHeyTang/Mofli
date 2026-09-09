import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../apps/studio/bin/scaffold.mjs";
test("scaffolds separate runtime dependencies from Studio and refuse overwrite", () => {
  const root = mkdtempSync(join(tmpdir(), "mofli-init-"));
  try {
    for (const type of ["skin", "attachment"]) {
      const dir = scaffold(join(root, type), { type });
      const manifest = JSON.parse(readFileSync(join(dir, "package.json")));
      assert.deepEqual(Object.keys(manifest.peerDependencies), [
        type === "skin" ? "@mofli/grove" : "@mofli/core",
      ]);
      assert.ok(manifest.devDependencies["@mofli/studio"]);
      assert.equal(manifest.scripts.dev, "mofli dev");
      assert.ok(
        readFileSync(join(dir, "mofli.project.ts"), "utf8").includes(
          "./src/index.js",
        ),
      );
      assert.throws(() => scaffold(dir), /already exists/);
    }
    assert.throws(() => scaffold(join(root, "bad"), { type: "oops" }), /type/);
    assert.throws(() => scaffold(join(root, "Bad Name")), /lowercase/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
