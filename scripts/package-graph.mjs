import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
export function libraryPackages(root = process.cwd()) {
  const packages = readdirSync(resolve(root, 'packages')).map(dir => {
    const path = resolve(root, 'packages', dir);
    return { path, manifest: JSON.parse(readFileSync(resolve(path, 'package.json'), 'utf8')) };
  });
  const pending = new Map(packages.map(p => [p.manifest.name, p]));
  const sorted = [];
  while (pending.size) {
    const ready = [...pending.values()].filter(({manifest: m}) =>
      Object.keys({...m.dependencies, ...m.peerDependencies}).every(dep => !pending.has(dep)));
    if (!ready.length) throw new Error('Package dependency cycle');
    for (const p of ready) { sorted.push(p); pending.delete(p.manifest.name); }
  }
  return sorted;
}
