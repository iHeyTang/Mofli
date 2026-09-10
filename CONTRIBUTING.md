# Mofli 源码开发

本指南面向修改 Mofli 引擎、Grove 官方资源或 Studio 实现的贡献者。使用开发套件创建自己的资源包，请阅读 [创作者工作流](docs/creator-workflow.md)，无需克隆本仓库。

## 准备仓库

克隆 Mofli 后进入仓库根目录。需要 Node.js 22.12 或更新版本；以下命令均在 Mofli 仓库根目录执行。

```sh
npm install
npm run studio
```

`npm run studio` 构建本地库并启动工作台，使用 workspace 中的实现。开发 Studio 界面时运行：

```sh
npm run dev
```

此处的 `npm run dev` 启动 Mofli 工作台源码的 Vite 开发服务器；创作者项目里的同名命令则加载创作者自己的 `mofli.project.ts`。

## 源码目录

| 目录 | 包 | 修改内容 |
| --- | --- | --- |
| `packages/core` | `@mofli/core` | 协议、注册与校验、引擎、绑定和浏览器渲染 |
| `packages/grove` | `@mofli/grove` | 官方骨架、皮肤、饰品定义 |
| `apps/studio` | `@mofli/studio` | React 工作台、CLI、脚手架和运行包导出 |
| `test` | — | 单元测试、浏览器测试与夹具 |

`apps/studio/src` 包含工作台和编辑模型，`bin` 包含 CLI，`resources.js` 收集项目资源。`reference.html`、`reference.ts`、`reference.css` 是开发服务器上的回归入口，不参与生产构建和 npm 分发。

## 开发 Grove 资源

完成仓库依赖安装后，在 Grove 自己的项目目录启动：

```sh
cd packages/grove
npm run dev
```

Studio 读取该目录的 `mofli.project.ts`，加载 `src/index.ts` 导出的源码资源集合。修改骨架、皮肤或饰品后自动重新加载，流程与第三方资源项目一致。保存到项目会写入此目录的 `pet.json`；在此目录运行 `npm run check` 校验，`npm run export:pet` 导出。

## 构建和验证

```sh
npm run build            # 构建 Core 与 Grove
npm run build:studio     # 工作台生产构建 → apps/studio/dist
npm test                 # 构建并运行单元测试
npm run typecheck        # workspace 类型检查
npm run test:packages    # 隔离安装、打包和创作者流程验证
MOFLI_BROWSER_CHANNEL=chrome npm run test:browser
```

包源码通过真实 exports 产物加载，修改 Core 或 Grove 后运行 `npm run build`。单独构建 Grove 使用 `npm run build --workspace @mofli/grove`，其 Core 依赖需先构建。

本地 CLI 入口为 `node apps/studio/bin/mofli.mjs`。测试脚手架文件生成可执行：

```sh
node apps/studio/bin/mofli.mjs init /tmp/my-pack --type pack --no-install
```

该示例仅生成文件；验证本地未分发改动的完整安装流程，使用 `npm run test:packages`，它会打包本地依赖并在临时目录验证。

修改协议前阅读 [架构](docs/architecture.md)。跨包使用公共 exports，Core 不依赖 Grove 或 Studio。保留 [第三方归属声明](THIRD_PARTY_NOTICES.md)。

## npm 发布

发布配置、验证命令和发布顺序见 [发布指南](docs/publishing.md)。

## 在线演示站

将 Studio 部署到自己的 Vercel 账号，供访客直接体验，见 [Vercel 部署指南](docs/vercel.md)。
