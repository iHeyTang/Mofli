# @mofli/skin-bloub

Bloub 原色皮肤；只直接依赖 `@mofli/rig-bloub`。导出 `bloubSkin` 和可供宿主直接使用的 `bloubPet = { rig, skin }`。

这是独立 ESM 包项目，源码、manifest 和 TypeScript 配置均在本目录；安装声明依赖后，`npm run build` 输出本包的 `dist/`。可以复制到单独仓库使用，不依赖 workspace 源码别名。尚未发布，当前保持 private。依赖未发布时请使用本地 tarball 或私有 registry。
