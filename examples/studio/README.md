# @mofli/studio

Mofli 的独立预览应用，通过公开 npm exports 使用 core、骨架和单款皮肤包。皮肤列表只在应用中组合。

在 monorepo 中先从根目录执行 `npm install`、`npm run build`，然后在本目录执行：

```sh
npm run dev -- --port 4173
npm run typecheck
npm run build
npm run preview -- --port 4173
```

生产输出位于本目录 `dist/`，包含 index.html、design.html。

复制本目录到独立仓库时，需要先从本地 tarball 或私有 registry 安装 manifest 中的 @mofli 依赖（目前尚未发布），再运行 `npm install` 和上述命令。Vite 与 TypeScript 由本项目声明，无需父目录脚本或编译配置。根目录 `npm run test:packages` 自动验证这一隔离安装与构建流程。
