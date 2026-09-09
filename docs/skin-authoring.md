# 皮肤开发

皮肤是绑定一个骨架的数据，包含 `id`、`name`、`version`、`rig`、颜色及可选的 `rigConfig`、`variants`、`markings`、`design`。具体能力由骨架声明和校验；皮肤不实现状态切换、投影或变形算法。

## 使用骨架工厂

```ts
import { defineResourcePack } from '@mofli/core';
import { bloubRig, defineBloubSkin } from '@mofli/grove';

const skin = defineBloubSkin({
  id: 'mint',
  name: 'Mint',
  colors: { body: '#567856', paper: '#f9f9f6' },
});
export default defineResourcePack({
  id: 'my-garden', version: 1, rigs: [bloubRig], skins: [skin],
});
```

项目依赖 `@mofli/core` 与 `@mofli/grove`；`@mofli/grove/rigs/bloub` 是子路径入口，不是独立 npm 包名。创建自己的骨架时可仅依赖 Core。

`rigConfig` 是耳长、眼距等几何默认值，必须处于骨架允许的范围。运行中的表情、动作与朝向属于 `pose`，不放入几何默认值。`exportSkin` 保存当前外观和几何配置。

## 外观能力

Bloub 的 Mallow、Pip、Pebble 提供不同的轮廓与五官设计数据，由骨架统一执行表情和过渡。可参考 Grove 对应皮肤定义编写 `design`，不要在皮肤中复制动画代码。

Mew 提供 `forehead`、`leftCheek`、`rightCheek` 表面。每个花纹包含唯一 ID、支持的 slot、六位十六进制颜色、0–1 透明度与 32 个局部边界点；坐标在 -1–1 内，按简单轮廓顺序排列。最多 8 个花纹。骨架负责投影、形变、裁切与状态可见性。

`variants` 只能选择骨架声明的样式。Mew 的眼睛支持 `capsule` 与 `oval`。未知样式、表面或超出范围的数据会被拒绝。这里不是任意纹理图片或 SVG 文档导入接口。

## 检查

在 Studio 中检查所有表情、动作、视线方向、参数极值和小尺寸显示。纯数据通过类型与范围校验，不等于造型自动合格。使用 [创作者工作流](creator-workflow.md) 保存完整宠物，并验证导出后的效果。
