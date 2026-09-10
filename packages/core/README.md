# @mofli/core

Mofli 的资源协议、校验、时钟、注册、绑定和 SVG 渲染。默认入口不读取 DOM，浏览器能力位于 `@mofli/core/browser`。运行时无外部依赖。

## 使用 SDK

在自己的应用或资源项目中安装：

```sh
npm install @mofli/core
```

使用公共导出实现自己的骨架、皮肤与饰品，或注册现有资源包。此流程无需下载 Mofli 源码，更多协议说明见 Mofli 源码仓库的 `docs/resource-packs.md`。

## 修改 Core 本身

在克隆后的 Mofli 仓库中修改 `packages/core/src`。构建与验证方式见仓库根目录的 `CONTRIBUTING.md`。

## License

Mofli v0.1 is a prototype. Mofli code is licensed under [MIT](LICENSE). Third-party code retains its original attribution; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
