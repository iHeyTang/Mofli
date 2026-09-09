# @mofli/rig-bloub

Bloub 参考骨架；只依赖 `@mofli/core`（peer）。导出 `bloubRig`、`bloubStates`、`defineBloubSkin` 和皮肤相关类型。包含 MIT 标注的上游算法，见本包 THIRD_PARTY_NOTICES.md。

这是独立 ESM 包项目，源码、manifest 和 TypeScript 配置均在本目录；安装声明依赖后，`npm run build` 输出本包的 `dist/`。可以复制到单独仓库使用，不依赖 workspace 源码别名。尚未发布，当前保持 private。依赖未发布时请使用本地 tarball 或私有 registry。

## 基础形状、表情与颜色

公开导出 `shapeOptions`、`expressionOptions`、`colorOptions`，分别对应参考项目的 8 种基础形状、16 种表情和 12 个颜色。形状目录为圆形、卵石、圆角方形、胶囊、三角形、六边形、云朵、水滴。

骨架配置 `rigConfig.shape` 使用目录的 `index`（0–7），运行姿态 `pose.expression` 使用表情索引（0–15）；两者默认 -1，使用骨架默认外观。猫头默认是软团母版，Bloub 默认是圆形。颜色通过 `colors.body` 设置，可取 `colorOptions` 的 `hex`。

形状和表情与 14 个动画状态独立：静候完整呈现选择的外观，使用基础身体的状态继承形状，感叹号、休眠等专用状态保留各自造型与表演。猫头在适用的基础形状上叠加耳部轮廓。形状与表情更新通过骨架内部插值；切换状态不会清空选项。工作台选择形状或表情时自动进入静候，便于预览。
