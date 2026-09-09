# @mofli/core

协议、校验、时钟、注册、通用绑定和 SVG 渲染。默认入口不读取 DOM，浏览器能力位于 `@mofli/core/browser`。运行时无外部依赖。

这是独立 ESM 包项目，源码、manifest 和 TypeScript 配置均在本目录；安装声明依赖后，`npm run build` 输出本包的 `dist/`。可以复制到单独仓库使用，不依赖 workspace 源码别名。尚未发布，当前保持 private。依赖未发布时请使用本地 tarball 或私有 registry。
