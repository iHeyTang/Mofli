# @mofli/studio

Mofli 的独立宠物工作台与 CLI，使用 React、HeroUI、TanStack Router 和 TanStack Query。动画由 Core 与 SVG renderer 驱动。

## 本地运行

在仓库根目录执行 `npm install`、`npm run studio`。编辑界面使用 `npm run dev`；生产构建使用 `npm run build:studio`，输出到 `apps/studio/dist`。

Node.js 要求 >=22.12。包尚未发布；发布后的启动入口为 `npx @mofli/studio`。

## 创作者命令

- `mofli init <目录> --type skin|attachment|pack`：创建项目。
- `mofli dev`：加载当前目录的 `mofli.project.ts`。
- `mofli check`：校验资源与宠物配置。
- `mofli export`：导出浏览器运行包。
- `--project <目录>`、`--port <端口>`：指定项目和监听端口。

无项目时使用内置 Grove 资源。完整流程见仓库的 [创作者工作流](../../docs/creator-workflow.md)。

## 源码

`src/` 包含工作台、资源目录、编辑模型和路由；`bin/` 包含 CLI、项目加载和导出；`resources.js` 收集项目资源。

`reference.html`、`reference.ts`、`reference.css` 为开发服务器上的引擎回归测试入口，不参与生产构建和 npm 分发。
