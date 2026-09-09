# 猫头骨架

只依赖 core，包含保留 MIT 来源声明的 Bloub 动画移植。支持 14 状态、8 基础形状和 16 静候表情。

默认是 A 软团母版，头耳一体，按 64 方向采样。head-turn.ts 按三视角设定稿插值，roll 与五官同步，俯仰有限压缩。是受约束的 2.5D 模型，无胡须。

rigConfig 包含 earLength（12–85，默认45）、cheek（-6–8，默认0）、shape（-1为软团，0–7为参考形状）。墨黑皮肤通过 rigConfig 提供默认耳长和脸型，用户可自行调整。

pose 包含 state（0–13，按 catStates 查询）、expression（-1默认，0–15参考表情）。专用状态保留自己的表演。

皮肤包含 body/face 颜色和 rigConfig 默认值。换肤应用几何，保留姿态。已开放额头/左右脸颊花纹与 capsule/oval 眼睛样式，详见 [表面皮肤](surface-skins.md)。通用纹理和材质尚未实现。见 [分层协议](character-layers.md)。
