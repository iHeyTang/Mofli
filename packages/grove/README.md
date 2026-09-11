# @mofli/grove

[GitHub](https://github.com/iHeyTang/Mofli) · [Issues](https://github.com/iHeyTang/Mofli/issues)

A little grove of Mofli companions: two rigs, six skins, and twenty data-driven accessories, built on @mofli/core.

## Use the collection

Install in your own application or resource project:

```sh
npm install @mofli/core @mofli/grove
```

Import grovePack (also the default export) to register the entire collection. Use rigs/bloub, rigs/mew, skins/mofli-dough or the accessories entry to build on individual resources. All resource labels and descriptions are in English.

Mallow, Pip and Pebble use IDs mofli-dough, mofli-bean and mofli-stone.

Grove depends only on core. Developers can extend its rigs and skin factories, or use core alone to author an independent resource pack.

Bloub-derived code retains its MIT attribution. See THIRD_PARTY_NOTICES.md.

## Optional 3D pet

`@mofli/grove/rigs/spatial` exports `spatialRig`, `spatialSkin`, `defineSpatialSkin` and `createSpatialPetScene`. 3D definitions use WebGL exclusively. Studio includes Spatial as an optional template. The existing `grovePack` and its 2D resources are unchanged.

## Contribute to Grove

To change the built-in collection itself, clone Mofli and follow the [source development guide](https://github.com/iHeyTang/Mofli/blob/main/CONTRIBUTING.md). Its implementation lives in packages/grove/src; accessory definitions are JSON under accessories.

From the Grove source directory, run:

```sh
npm run dev
```

Studio reads `mofli.project.ts` in this directory and loads `src/index.ts` directly. Edit the rigs, skins or accessory JSON under `src/` to preview changes. Save the composition to this project, then run `npm run check` and `npm run export:pet`.

Studio is a development dependency only. The published resource package contains its runtime exports; it does not require the project configuration to be consumed.

## License

Mofli v0.1 is a prototype. Mofli code is licensed under [MIT](LICENSE). Third-party code retains its original attribution; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

3D 模板 `spatialSkins` 包含 Mallow、Pip、Pebble 的果冻版本，复用原版轮廓与表情数据，提供 19 个表情、8 个动作、6 个基础形状。默认采用透亮浅色；原版 2D 资源及其配色不变。3D 固定使用 WebGL，详见 [3D 文档](../../docs/3d.md)。
