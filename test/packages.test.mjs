import { FixtureEngine as PetEngine } from "./fixtures/configured-engine.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";
import { defineBloubSkin, bloubRig } from "@mofli/rig-bloub";
import { defineCatSkin } from "@mofli/rig-cat-head";
import { bloubPet } from "@mofli/skin-bloub";

const root = resolve("packages");
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(resolve(path, e.name))
      : e.name.endsWith(".ts")
        ? [resolve(path, e.name)]
        : [],
  );
}
test("package dependency direction and source imports enforce 1 + n + m", () => {
  for (const name of readdirSync(root)) {
    const dir = resolve(root, name),
      m = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));
    const deps = Object.keys({ ...m.dependencies, ...m.peerDependencies });
    if (name === "core") assert.deepEqual(deps, []);
    else if ((name.startsWith("rig-") || name.startsWith("attachment-"))) assert.deepEqual(deps, ["@mofli/core"]);
    else {
      assert.equal(deps.length, 1);
      assert.ok(deps[0].startsWith("@mofli/rig-"));
    }
    for (const file of files(resolve(dir, "src"))) {
      const ast = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        const spec =
          ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
            ? node.moduleSpecifier
            : undefined;
        if (spec && ts.isStringLiteral(spec)) {
          const value = spec.text;
          if (value.startsWith("."))
            assert.ok(
              !relative(dir, resolve(dirname(file), value)).startsWith(".."),
              file + ": sibling source import",
            );
          else
            assert.ok(
              deps.some(d => value === d || value.startsWith(d + "/")),
              file + ": undeclared import " + value,
            );
        }
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
});
test("rig skin factories bind identity and validate parameters before packaging", () => {
  const skin = defineBloubSkin({
    id: "custom",
    name: "Custom",
    colors: { body: "#123456" },
  });
  assert.equal(skin.rig, bloubRig.id);
  assert.equal("parameters" in skin, false);
  assert.throws(() =>
    defineBloubSkin({ id: "bad", name: "Bad", parameters: { state: 1.5 } }),
  );
  assert.throws(
    () =>
      new PetEngine(bloubRig, defineCatSkin({ id: "cat", name: "Cat" })),
  );
  assert.ok(new PetEngine(bloubPet.rig, bloubPet.skin).sample(1).shapes.length);
});

test("each skin package supplies exactly one skin and its pet definition", async () => {
  for (const name of readdirSync(root).filter(name => name.startsWith('skin-'))) {
    const values = Object.values(await import(`@mofli/${name}`));
    const skins = values.filter(value => value?.version === 1 && typeof value.rig === 'string');
    const pets = values.filter(value => value?.rig?.id && value?.skin);
    assert.equal(skins.length, 1, name);
    assert.equal(pets.length, 1, name);
    assert.equal(pets[0].skin, skins[0]);
    assert.ok(new PetEngine(pets[0].rig, skins[0]).sample(1).shapes.length);
  }
});

test("studio owns its toolchain and only imports declared public packages", () => {
  const dir = resolve('examples/studio');
  const manifest = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
  for (const script of ['dev', 'build', 'preview', 'typecheck']) assert.ok(manifest.scripts[script]);
  for (const dep of ['vite', 'typescript']) assert.ok(manifest.devDependencies[dep]);
  for (const name of readdirSync(dir).filter(name => /\.(ts|js)$/.test(name))) {
    const file = resolve(dir, name);
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const spec = ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ? node.moduleSpecifier : undefined;
      if (spec && ts.isStringLiteral(spec)) {
        const value = spec.text;
        if (value.startsWith('.')) assert.ok(!relative(dir, resolve(dirname(file), value)).startsWith('..'), value);
        else if (!value.startsWith('node:')) assert.ok(
          Object.keys({...manifest.dependencies,...manifest.devDependencies}).some(dep => value === dep || value.startsWith(dep + '/')), value);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
