# 发布到 npm

从仓库根目录执行。根工作区保持 private；发布包为 `@mofli/core`、`@mofli/grove`、`@mofli/studio`，CLI 命令为 `mofli`。

## 发布前验证

```sh
npm ci
npm run release:check
npm run build:release
```

`release:check` 包含单元测试、类型检查、Studio 生产构建，以及临时目录中的独立构建、打包安装、CLI 模板与导出验证。打包验证检查许可证、第三方声明和公共入口文件。每个包的 `prepack` 自动重新构建自身；依赖包仍需先按顺序构建。修改浏览器交互时另运行浏览器测试。

Mofli 自有代码采用 MIT。根目录及三个发布包的 LICENSE 必须一致，第三方声明不可移除。Studio 包含源码与 Vite 工具链，用于加载创作者项目，请勿仅保留 dist。

## 检查产物

```sh
npm pack --workspace @mofli/core --dry-run
npm pack --workspace @mofli/grove --dry-run
npm pack --workspace @mofli/studio --dry-run
```

仓库尚未配置远程地址。确定公开源码地址后，为三个包补充真实的 `repository`（含 `directory`）、`homepage`、`bugs`，并将 README 的源码文档引用替换为可访问链接。

## 正式发布

由具备 mofli 组织发布权限的账号执行登录和验证：

```sh
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
```

按依赖顺序发布，每一步成功且 registry 可查询后再进行下一步：

```sh
npm publish --workspace @mofli/core
npm view @mofli/core@0.1.0 version --registry=https://registry.npmjs.org
npm publish --workspace @mofli/grove
npm view @mofli/grove@0.1.0 version --registry=https://registry.npmjs.org
npm publish --workspace @mofli/studio
```

以上示例是首次 0.1.0 发布。后续必须使用未发布的新版本，同时更新内部依赖范围和 package-lock.json。脚手架使用 Studio 版本生成 Core/Grove 依赖范围，因此当前采用三个包同步版本发布。

发布后在空目录验证：

```sh
npx --yes @mofli/studio@0.1.0 --help
npx --yes @mofli/studio@0.1.0 init my-pack --type pack
cd my-pack
npm run check
npm run dev
```
