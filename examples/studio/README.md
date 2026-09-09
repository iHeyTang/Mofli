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

## Mofli 角色方向

`/character.html` 提供糯团、芽豆、绒石三组静态 SVG 设定稿，每组含静候、好奇、受惊及小尺寸比较。支持隐藏五官查看剪影、下载 SVG、在当前浏览器保存方向选择。选择不会更改运行中的宠物；这不是新增骨架或皮肤包，后续需将选定设计映射到当前骨架的约束和动画。原猫头设定稿保留在 `/design.html`。

`/personality.html` 并排实时渲染三款皮肤的静候、好奇、开心、受惊、不耐烦。皮肤使用 `variants.temperament` 选择骨架定义的 mellow / spry / steady 配置。骨架管理独立眼睑、弯曲眼形、瞳孔大小与轻微伸缩；特殊符号和粒子动作仍保留参考行为。
