# 部署 Mofli 在线演示站

把 Studio 部署到自己的 Vercel 账号，分享网址供访客直接体验。访客无需安装 npm 包或克隆仓库。

## 项目配置

仓库根目录的 `vercel.json` 已配置：

| 设置 | 值 |
| --- | --- |
| Root Directory | 仓库根目录，保留默认值 |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build:studio` |
| Output Directory | `apps/studio/dist` |
| Node.js Version | 在 Vercel 项目设置中选择 22.x |

无需配置环境变量。构建命令会先通过 `prebuild:studio` 按依赖顺序构建 Core、Grove，再构建 Studio。内部依赖来自 npm workspace，无需先发布到 npm。

### 已经选择 apps/studio 作为 Root Directory

也可以保留 `apps/studio`。该目录的 `vercel.json` 会回到仓库根目录安装、构建整个依赖链，并使用相对于 Studio 的 `dist` 输出目录：

| 设置 | 值 |
| --- | --- |
| Root Directory | `apps/studio` |
| Install Command | `npm --prefix ../.. ci` |
| Build Command | `npm --prefix ../.. run build:studio` |
| Output Directory | `dist` |

在 Vercel 的 Root Directory 设置中开启“Include source files outside of the Root Directory in the Build Step”，以便访问 Core、Grove 和根目录锁文件。关闭之前手动填写的构建命令、安装命令和输出目录 Override，让配置文件生效；如继续手动设置，必须与上表一致。

如果日志显示 `workspace @mofli/studio` 和 `Missing script: "build:studio"`，说明把根目录的构建命令放到了 Studio 目录执行。不要在 Studio 内直接运行 `npm run build:studio`：要么将 Root Directory 改回仓库根目录，要么使用上面的 Studio 配置。

SPA 重写让 `/project` 等前端路由在直接打开或刷新时仍返回应用入口；静态资源由 Vercel 正常提供。

## 从 Git 仓库部署

1. 将完整 Mofli 仓库（包含 `package-lock.json` 和 `vercel.json`）推送到自己的 GitHub 仓库。
2. 在 Vercel 新建项目，导入该仓库。
3. 保持 Root Directory 为仓库根目录，确认上述构建设置，选择 Node.js 22.x，点击 Deploy。
4. 确认 Production Branch 指向包含当前代码的分支。如果代码尚未合并到 main，应选择实际开发分支。
5. 部署后在 Domains 中查看实际域名。如果 `mofli.vercel.app` 可用，可将它设为演示地址；否则选择其他可用名称。

之后向配置的生产分支推送代码即可触发更新。拿到并验证实际网址后，再把它作为“在线体验”链接加入中英文 README。

## 直接从本地部署

也可以不先连接 Git，在仓库根目录执行：

```sh
npx vercel login
npx vercel
```

按提示关联自己的 Vercel 账号和项目，保持项目根目录为 `./`，并在项目设置中确认 Node.js 22.x。先查看生成的预览站；确认后执行正式部署：

```sh
npx vercel --prod
```

本地关联信息写入 `.vercel/`，已加入 Git 忽略列表。

## 演示站的能力

- 浏览内置宠物、组合皮肤和饰品、调整参数并预览交互。
- 导入、导出宠物配置，保存到当前浏览器的 localStorage。
- 无需后端或数据库；保存内容不会跨设备同步。
- 本地源码项目加载、写入项目文件和 CLI 运行包导出仍通过本地 Studio 完成。

部署后检查首页、直接打开和刷新 `/project`、导入导出 JSON，以及保存后刷新恢复。演示站应显示“保存到浏览器”，不会请求本地 CLI 的保存接口。

## 本地构建验证

```sh
npm run build:studio
npm run preview --workspace @mofli/studio
```

参考：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[构建配置](https://vercel.com/docs/builds/configure-a-build)。
