# @mofli/grove

A little grove of Mofli companions: two rigs, six skins, and twenty data-driven accessories, built on @mofli/core.

## Use the collection

Install in your own application or resource project:

```sh
npm install @mofli/core @mofli/grove
```

Import grovePack (also the default export) to register the entire collection. Use rigs/bloub, rigs/mew, skins/mofli-dough or accessories/sprout subpaths to build on individual resources. All resource labels and descriptions are in English.

Mallow, Pip and Pebble use IDs mofli-dough, mofli-bean and mofli-stone.

Grove depends only on core. Developers can extend its rigs and skin factories, or use core alone to author an independent resource pack.

Bloub-derived code retains its MIT attribution. See THIRD_PARTY_NOTICES.md.

## Contribute to Grove

To change the built-in collection itself, clone Mofli and follow the [source development guide](../../CONTRIBUTING.md). Its implementation lives in packages/grove/src; accessory definitions are JSON under accessories/data.
