# Mofli

**English** | [简体中文](README.zh-CN.md)

A framework-independent engine for interactive SVG pets. Combine rigs, skins, and accessories, then preview, customize, and export your pet in Studio for use in your own project.

Requires Node.js 22.12 or later.

## Build a pet

```sh
npx @mofli/studio
```

Open the address shown in your terminal, choose from Grove's built-in resources, adjust parameters, and save your pet as JSON. To develop your own resources and export a runtime bundle, create a project as described below.

## Develop your resources in Studio

Create your own project and start Studio from that directory. Your skins and accessories appear in Studio's library, ready to preview, assemble, and debug.

```sh
# Create a project and install dependencies
npx @mofli/studio init my-pack --type pack

# Start Studio with your project's resources
cd my-pack
npm run dev
```

The CLI generates a project with the configuration already in place:

```text
my-pack/
├── src/index.ts       # Your resource implementations and pack export
├── mofli.project.ts   # Tells Studio which resource pack to load
├── package.json      # Dependencies and development/export commands
└── tsconfig.json     # TypeScript configuration
```

Open the address shown in your terminal. The starter's custom skin and accessory are already available in Studio. Edit `my-pack/src/index.ts` to see your changes automatically reloaded in the workspace.

On startup, Studio reads `mofli.project.ts` from your project root. The generated configuration loads the resource pack exported by `src/index.ts`. Add rigs, skins, or accessories to that pack to make them available in Studio.

Assemble your pet in Studio, click “保存到项目” (Save to project), then run these commands from `my-pack`:

```sh
npm run check        # Validate resources and pet configuration
npm run export:pet   # Export a pet runtime bundle for your application
```

To develop only a skin or accessory, use `--type skin --rig bloub`, `--type skin --rig mew`, or `--type attachment` in the creation command. See the [creator workflow](docs/creator-workflow.md) for details.

## Use a pet in your application

Install the runtime dependencies in your application project:

```sh
npm install @mofli/core @mofli/grove
```

Register a resource pack and load the pet configuration saved by Studio:

```ts
import { PetRegistry } from '@mofli/core';
import { createPet } from '@mofli/core/browser';
import { grovePack } from '@mofli/grove';

const registry = new PetRegistry().registerPacks(grovePack);
const pet = createPet({ container, registry, config });

pet.setMood('happy');
// Release resources when the page or component unmounts.
pet.destroy();
```

`container` is a DOM element with a defined width and height. `config` is the pet JSON object. You can also use the browser runtime bundle exported by the CLI.

## SDK documentation

The following guides are currently in Chinese:

- [Creator workflow](docs/creator-workflow.md): project setup, Studio development, saving, and exporting.
- [Resource packs](docs/resource-packs.md): organize and register rigs, skins, and accessories.
- [Architecture](docs/architecture.md): responsibilities, execution model, and constraints.
- [Skin authoring](docs/skin-authoring.md): appearance, geometry defaults, and surface patterns.
- [Accessory authoring](docs/attachment-authoring.md): mount interfaces, SVG scenes, and declarative animation.
- [Pet configuration](docs/pet-config.md): saved format and application integration.
- [Binding utilities](docs/bindings.md): local coordinates, surface projection, and joint chains.

## Develop Mofli itself

To modify Core, Grove, or Studio, read the [source development guide](CONTRIBUTING.md) (Chinese). Its workspace installation, build, and test commands apply to the Mofli repository.

## Runtime boundaries

Mofli is a constrained SVG / 2.5D engine. It does not solve arbitrary 3D intersections or collisions. Resource packs run as trusted code, without a sandbox for untrusted plugins. Core's default entry point is DOM-independent; browser integration is available through `@mofli/core/browser`.

## Origins and acknowledgments

Mofli was originally inspired by [Bloub](https://github.com/jeremy-prt/bloub). Thank you to **Jérémy Perret** for sharing the SVG character morphing, eye animation, and head orientation implementation that provided a foundation for Mofli's exploration.

Mofli's Bloub rig, parts of the Mew rig, and the contour and facial calculations extracted into Core use and adapt Bloub source code. These portions retain **Copyright (c) 2026 Jérémy Perret** and are distributed under the **MIT License**. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the source, revision, and full license text.

Bloub recreates the x.ai / Grok bot avatar. Its MIT license covers the code, not rights to the original character design or trademarks, which belong to their respective owners. Mofli is not affiliated with or endorsed by x.ai.
