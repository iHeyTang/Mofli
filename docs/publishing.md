# 版本管理与发布

发布包为 `@mofli/core`、`@mofli/grove`、`@mofli/studio`，CLI 命令为 `mofli`。根工作区保持 private。三个包使用 Changesets fixed group 同步版本，根版本、内部依赖范围和 package-lock.json 也同步更新。

## 日常流程

1. 完成功能或修复后运行 `npm run changeset`，选择相关包、patch/minor/major，并填写变更说明。把生成的 `.changeset/*.md` 和代码一起提交。纯文档、测试或 CI 修改可以不添加 changeset。
2. 合并到 `main` 后，Release workflow 自动创建或更新 `Release Mofli` PR，包含三个包的版本、CHANGELOG、内部依赖和 lockfile。不同 changeset 合并时采用所需的最高升级级别。
3. 检查版本 PR 和对应 Release workflow 的验证结果，然后合并版本 PR。无需手工改版本、打 tag 或本地打包。
4. GitHub Actions 从合并后的提交重新安装依赖，完成 `release:check`，依次发布 Core → Grove → Studio。每个包都要等 npm 元数据和 tarball 可访问后才进入下一步。
5. 从 npm 在空目录运行 Studio CLI，成功后创建统一的 `vX.Y.Z` tag 和 `Mofli X.Y.Z` GitHub Release，内容汇总三个包当前版本的 CHANGELOG。

版本的 patch/minor/major 由开发者在 changeset 中明确选择，不从 commit 文案猜测。只接入 CI 不会升级或重新发布已有的 0.2.0，也不会为历史版本补造变更说明。目前自动化只支持稳定版本，预发布需要另行设计渠道和 dist-tag。

## 首次接入设置

工作流位于 `.github/workflows/ci.yml` 和 `.github/workflows/release.yml`。需要一次性完成以下仓库与 npm 账号设置：

- GitHub 仓库 Settings → Actions → General → Workflow permissions：开启 **Allow GitHub Actions to create and approve pull requests**。默认 token 权限仍可保持 read；工作流按 job 声明写权限。版本 PR 不会自动合并。
- 在三个 npm 包的 Settings → Trusted Publisher 分别添加 GitHub Actions：owner 为 `iHeyTang`，repository 为 `Mofli`，workflow filename 为 `release.yml`，environment 留空，并允许直接 `npm publish`。
- 使用 GitHub-hosted runner。发布 job 使用 Node 24、npm 11.19.1 和 `id-token: write`，通过 OIDC 发布，不需要配置 `NPM_TOKEN`。npm 自动生成 provenance。

支持 `npm trust` 的 npm CLI 也可配置绑定（需要包写权限及账号 2FA，按提示完成账号验证）：

```sh
npx --yes npm@11.19.1 trust github @mofli/core --repo iHeyTang/Mofli --file release.yml --allow-publish
npx --yes npm@11.19.1 trust github @mofli/grove --repo iHeyTang/Mofli --file release.yml --allow-publish
npx --yes npm@11.19.1 trust github @mofli/studio --repo iHeyTang/Mofli --file release.yml --allow-publish
```

GitHub 默认 token 创建的版本 PR 可能不会触发独立的 PR CI，因此 Release workflow 会额外验证生成的版本分支，发布 job 也会验证合并后的提交。如果仓库设置了必须通过的 PR checks，需要为 bot PR 配置适合的 GitHub App token 或手动触发检查，避免永久等待。

## 验证与失败恢复

```sh
npm ci
npm run release:check
```

`release:check` 包含版本与 lockfile 一致性、单元测试、类型检查、Studio 生产构建，以及临时目录中的独立构建、打包安装、CLI 模板与导出验证。浏览器交互变更仍需按 AGENTS.md 运行浏览器测试并检查桌面和移动端。CI 接入本身不替代视觉验收。

`npm run version:packages` 用于在版本分支应用待发布 changeset，一般由机器人执行。`npm run release:publish` 仅允许在本仓库 main 分支的 GitHub Actions 中执行。

发布不是跨包原子操作。失败后在 Actions → Release 对当前 main 手动运行 workflow（或在 main 未变化时重跑失败任务）。已存在的 npm 版本会跳过，未发布的继续；只有所有包可下载且 CLI 验证通过后才创建 GitHub Release。网络或鉴权错误会使流程失败，不会被当成包不存在。npm 传播单个包最多等待约 10 分钟，超时可重跑。工作流不会取消正在执行的发布，也拒绝过时提交或回退 npm latest。

如果发布阶段需要修改包内容，不能覆盖已经发布的版本：修复代码并添加新的 changeset，统一发布下一个版本。若旧版本处于部分发布状态，优先在原提交上完成重跑，再合并下一批 changeset。

## 包边界与许可证

Mofli 自有代码采用 MIT。根目录及三个发布包的 LICENSE 必须一致，第三方声明不可移除。打包验证检查许可证、THIRD_PARTY_NOTICES.md、GitHub 元数据和公共入口。Studio 包含源码与 Vite 工具链，用于加载创作者项目，不仅包含 dist。各包 `prepack` 自动构建自身。

参考：[Changesets 配置](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md)、[Changesets Action 1.x](https://github.com/changesets/action/tree/maintenance/v1)、[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)、[npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/)。当前锁定 Changesets CLI 2.x 与 Action 1.x；升级到 CLI 3.x 时需一起迁移 Action 配置。
