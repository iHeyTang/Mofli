import { mkdtempSync, cpSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { libraryPackages } from './package-graph.mjs';
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), 'mofli-packages-'));
const packages = libraryPackages(root);
const tarballs = new Map();
const manifests = new Map(packages.map(p => [p.manifest.name, p.manifest]));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'pipe' }).toString();
function install(project, manifest) {
  // Replace only internal package versions with packed artifacts. Keep every
  // external dependency/devDependency as declared, including the local toolchain.
  const closure = new Set();
  function visit(m) {
    for (const dep of Object.keys({...m.dependencies, ...m.peerDependencies})) {
      if (!manifests.has(dep) || closure.has(dep)) continue;
      closure.add(dep); visit(manifests.get(dep));
    }
  }
  visit(manifest);
  const m = structuredClone(manifest);
  for (const field of ['dependencies', 'peerDependencies'])
    for (const dep of Object.keys(m[field] ?? {}))
      if (tarballs.has(dep)) m[field][dep] = `file:${tarballs.get(dep)}`;
  // Supply transitive workspace peers without reaching an unpublished registry.
  m.devDependencies ??= {};
  for (const dep of closure) m.devDependencies[dep] = `file:${tarballs.get(dep)}`;
  writeFileSync(join(project, 'package.json'), JSON.stringify(m, null, 2));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock'], project);
}
try {
  for (const { path, manifest } of packages) {
    const isolated = join(temp, manifest.name.replace('@mofli/', ''));
    cpSync(path, isolated, { recursive: true, filter: source => !['node_modules', 'dist'].includes(source.split('/').at(-1)) });
    install(isolated, manifest);
    run('npm', ['run', 'build'], isolated);
    run('npm', ['run', 'typecheck'], isolated);
    // Pack the independently built output using its original dependency manifest.
    writeFileSync(join(isolated, 'package.json'), JSON.stringify(manifest, null, 2));
    const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temp], isolated))[0];
    if (packed.files.some(f => f.path.includes('node_modules'))) throw new Error('Bundled node_modules');
    tarballs.set(manifest.name, join(temp, packed.filename));
    console.log(`${manifest.name}: isolated install, build, typecheck and pack OK`);
  }
  const consumer = join(temp, 'consumer'); mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({private:true,type:'module'}));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', ...tarballs.values()], consumer);
  const skinNames = packages.map(p => p.manifest.name).filter(n => n.startsWith('@mofli/skin-'));
  writeFileSync(join(consumer, 'smoke.mjs'), `
    import assert from 'node:assert/strict';
    import { PetEngine } from '@mofli/core';
    for (const name of ${JSON.stringify(skinNames)}) {
      const exports = Object.values(await import(name));
      const skins = exports.filter(v => v?.version === 1 && typeof v.rig === 'string');
      assert.equal(skins.length, 1, name + ': exactly one skin per package');
      const pets = exports.filter(v => v?.rig?.id && v?.skin);
      assert.equal(pets.length, 1, name + ': exactly one pet definition');
      assert.equal(pets[0].skin, skins[0]);
      assert.ok(new PetEngine(pets[0].rig, skins[0]).sample(.75).shapes.length);
    }
    assert.throws(() => import.meta.resolve('@mofli/core/rigs'));
  `);
  run(process.execPath, ['smoke.mjs'], consumer);
  console.log('Packed consumer: each skin package exports one renderable skin.');
  const studio = join(temp, 'studio');
  cpSync(join(root, 'examples/studio'), studio, {recursive:true, filter: source => !['node_modules','dist'].includes(source.split('/').at(-1))});
  install(studio, JSON.parse(readFileSync(join(studio, 'package.json'), 'utf8')));
  run('npm', ['run', 'typecheck'], studio);
  run('npm', ['run', 'build'], studio);
  for (const page of ['index.html', 'design.html']) readFileSync(join(studio, 'dist', page));
  console.log('@mofli/studio: isolated install, typecheck and two-page production build OK');
} catch (error) {
  console.error(error.stdout?.toString() ?? '', error.stderr?.toString() ?? ''); throw error;
} finally { rmSync(temp, {recursive:true,force:true}); }
