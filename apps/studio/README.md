# @mofli/studio

[GitHub](https://github.com/iHeyTang/Mofli) · [Issues](https://github.com/iHeyTang/Mofli/issues)

Mofli 宠物工作台与 CLI。需要 Node.js >=22.12。

## 使用工作台

在任意目录运行，无需克隆 Mofli：

```sh
npx @mofli/studio
```

默认地址为 `http://127.0.0.1:14517`，可通过 `--port` 自定义端口。

无项目时使用 Grove 内置素材库。存在 `mofli.project.ts` 时自动加载你的资源项目。

## 开发自己的资源包

```sh
npx @mofli/studio init my-pack --type pack
cd my-pack
npm run dev
```

修改生成项目的 `src/index.ts`，在工作台预览并保存到项目，然后在同一目录运行：

```sh
npm run check
npm run export:pet
```

`--type skin` 创建皮肤项目，`--type attachment` 创建饰品项目；`--rig bloub|mew` 选择皮肤模板使用的骨架。完整流程见 [创作者工作流](https://github.com/iHeyTang/Mofli/blob/main/docs/creator-workflow.md)。

## 创建 3D 宠物

Studio 先选择 2D / 3D，再选择角色与饰品。2D 使用 SVG，3D 固定使用 WebGL；新建宠物沿用当前类型。

创建源码项目：

```sh
npx @mofli/studio init my-3d-pet --dimension 3d
```

支持 3D skin 或 pack 模板；`--rig spatial` 可选择 Spatial 骨架。导出的 `mountPet(container)` 固定使用 WebGL。

## CLI

- `npx @mofli/studio dev`：启动工作台。
- `npx @mofli/studio check`：校验当前资源项目与宠物配置。
- `npx @mofli/studio export`：将当前项目的 pet.json 导出为浏览器运行包。
- `--project <目录>`、`--port <端口>`：指定资源项目和监听端口。

## 修改 Studio 本身

工作台源码使用 React、HeroUI 和 TanStack。克隆 Mofli 后，按[源码开发指南](https://github.com/iHeyTang/Mofli/blob/main/CONTRIBUTING.md) 安装 workspace 依赖并运行本地开发服务器。这与上面开发自己的资源包是两条独立流程。

## License

Mofli v0.1 is a prototype. Mofli code is licensed under [MIT](LICENSE). Third-party code retains its original attribution; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

3D 目录缩略图使用一个临时共享渲染器生成静态预览，每次绘制后分批处理，并按骨架对象及完整外观参数缓存（每个骨架最多 128 项）。切换宠物不会同步生成整组 SVG 缩略图；未完成的旧角色任务会取消。无 WebGL 时显示预览不可用。该缓存只用于 Studio 卡片，不改变宠物定义和主画布。
