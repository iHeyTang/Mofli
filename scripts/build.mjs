import { execFileSync } from 'node:child_process';
import { libraryPackages } from './package-graph.mjs';
for (const { manifest } of libraryPackages())
  execFileSync('npm', ['run', 'build', '--workspace', manifest.name], { stdio: 'inherit' });
