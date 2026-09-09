# Mofli Studio

正式的独立创作应用，目录为 `apps/studio`，npm 包名为 `@mofli/studio`。

- React 19 + TypeScript：组件与交互。
- HeroUI 3 + Tailwind 4：默认控件、主题与无障碍交互。
- TanStack Router：`/` 创作页与 `/project` 项目交付页。
- TanStack Query：保存、导入与恢复的异步状态。
- Core + SVG renderer：独立驱动宠物动画帧。

发布后直接运行 `npx @mofli/studio`。没有项目文件时打开内置素材库；存在 `mofli.project.ts` 时自动加载本地项目。`--project <目录>` 显式指定项目，`--port <端口>` 改变监听端口。目前未发布；仓库根目录运行 `npm run studio`。

源码模块：`src/catalog.ts` 素材注册、`src/model.ts` 编辑模型、`src/components.tsx` 渲染与通用控件、`src/workshop.tsx` 工作台、`src/project-page.tsx` 项目交付、`src/main.tsx` 路由入口。`bin/` 包含脚手架、项目开发服务器与运行包导出命令。

`reference.html` 是原始引擎回归测试夹具；`character.html`、`design.html` 和 `personality.html` 为历史设计研究资料，不属于正式应用导航。

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

本包提供 `mofli` 命令（Node.js >=22.12）。`mofli init my-skin --type skin` 创建并安装项目；`mofli dev` 读取当前目录的 `mofli.project.ts`，支持源码重新加载与项目保存；`mofli check` 验证项目；`mofli export` 将 `pet.json` 打成独立浏览器运行包。仓库开发用 `node apps/studio/bin/mofli.mjs --help` 查看命令。

混合资源包：`mofli init my-collection --type pack` 创建同一个 npm 包内的多骨架、多皮肤、饰品示例。在 `mofli.project.ts` 中使用 `{packs:[pack]}` 注册。内置 20 款饰品已合并为 `@mofli/grove/accessories`，各款形状和动画均为 JSON 数据。
