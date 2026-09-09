# 皮肤与骨架的配置边界

依赖仍为皮肤包 → 一个骨架包 → 核心，没有独立的骨架预设层。

骨架定义结构、参数范围、绑定和运动约束。Skin 包含 version/id/name/rig/colors，以及可选 rigConfig 默认几何值。参数归骨架解释，默认值可由皮肤选择；状态和表情不属于皮肤。

创建实例时按骨架默认值 → 皮肤 rigConfig → 显式实例 rigConfig 的顺序覆盖。setSkin 应用新皮肤的颜色和几何，未指定的几何键回到骨架默认值，不继承上一款皮肤；当前 pose 和播放时钟默认保留。

setRigConfig 用于运行时调整，不改动皮肤原始默认值。exportSkin 把当前外观和实际几何保存成皮肤，不包含 pose、时钟或历史事件。getSkin 返回已加载的皮肤定义，getCharacter/setCharacter 用于包含运行姿态的组合配置。配置更新是完整替换，局部编辑使用展开现有配置的方式。

```ts
const engine = new PetEngine(catHeadRig, sesame);
engine.setRigConfig({ ...engine.getRigConfig(), earLength: 40 }, 1);
const savedSkin = engine.exportSkin();
engine.setPose({ ...engine.getPose(), state: 3 }, 2);
engine.setSkin(sesame, 3); // 应用软团外观与几何，保留当前姿态
```

Skin 还可包含 markings（局部花纹）与 variants（骨架支持的绘制样式）。猫头已实现三处表面绑定和两种眼睛画法，见 [表面皮肤协议](surface-skins.md)。任意纹理、材质尚未开放。墨黑只保留一款，耳长和脸型在参数区调整。RigBinding 是骨架计算输入，不是可分发皮肤；prepare/updateSkin/sample 的内部绑定流程继续保留形变插值。

迁移：旧 parameters 中的几何键放入皮肤 rigConfig，state/expression 放入运行时 pose。独立 RigPreset 与 Rig.presets 已撤下。旧 parameters 混合字段仍拒绝接受。
