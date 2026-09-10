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
