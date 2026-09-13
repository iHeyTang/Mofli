# 版本与变更说明

修改可发布的功能或修复后，在仓库根目录运行 `npm run changeset`，选择包、patch/minor/major，并填写面向使用者的变更说明，将生成的 Markdown 和代码一起提交。

三个包属于 fixed group：任意一个包升级，Core、Grove、Studio 都会升级到同一版本。文档、测试和 CI 配置调整可以不添加 changeset。

合并到 main 后，GitHub Actions 自动维护 `Release Mofli` 版本 PR；合并版本 PR 后自动发布 npm 和 GitHub Release。无需手动修改版本或推送 tag。详见 [发布文档](../docs/publishing.md)。
