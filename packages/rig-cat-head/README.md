# @mofli/rig-cat-head

只依赖 @mofli/core，导出 catHeadRig、catStates、defineCatSkin。

当前采用用户选定的 A「软团」正面母版。`soft-tuft-master.svg` 为来源，`src/soft-master.ts` 为 64 方向采样。头与耳是一条连续轮廓，撤下了轮廓外的独立耳朵；earLength 控制母版耳部增量，cheek 控制轻微横向饱满度。

保留 Bloub 的 14 状态和动作计算，并保留 MIT 来源声明。符号类形态沿用参考轮廓；其他头部形态融入耳部轮廓增量。静候使用母版的正面小五官。正面、四分之三侧面和侧面母版现在按水平朝向插值，头部倾斜与五官使用同一 roll，俯仰采用有限的轮廓压缩。这是受约束的 2.5D 设定稿插值，不是三维重建。

state 数字索引对应 catStates。独立 ESM 包，private、未发布。

## 基础形状、表情与颜色

公开导出 `shapeOptions`、`expressionOptions`、`colorOptions`，分别对应参考项目的 8 种基础形状、16 种表情和 12 个颜色。形状目录为圆形、卵石、圆角方形、胶囊、三角形、六边形、云朵、水滴。

骨架配置 `rigConfig.shape` 使用目录的 `index`（0–7），运行姿态 `pose.expression` 使用表情索引（0–15）；两者默认 -1，使用骨架默认外观。猫头默认是软团母版，Bloub 默认是圆形。颜色通过 `colors.body` 设置，可取 `colorOptions` 的 `hex`。

形状和表情与 14 个动画状态独立：静候完整呈现选择的外观，使用基础身体的状态继承形状，感叹号、休眠等专用状态保留各自造型与表演。猫头在适用的基础形状上叠加耳部轮廓。形状与表情更新通过骨架内部插值；切换状态不会清空选项。工作台选择形状或表情时自动进入静候，便于预览。
