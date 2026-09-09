# 编写饰品

饰品定义「长什么样、挂在哪里、如何运动」。骨架负责挂载的形变与朝向，core 负责投影、表面绑定、几何采样和支持的运动、深度排列。饰品包只依赖 `@mofli/core`，无需依赖 Studio。

## 创建项目

发布后的命令设计为 `npx @mofli/studio init my-decoration --type attachment`。当前包仍 private，未发布；仓库内可用 `node apps/studio/bin/mofli.mjs init <目录> --type attachment --no-install` 查看生成结果，安装依赖需使用本地打包产物。

CLI 生成 `defineAttachment` 声明式模板。进入项目后运行 `npm run dev`，在 Studio 搭配、保存宠物 JSON；使用 CLI `export` 生成接入项目的运行时。导出与 Studio 使用同一 core 渲染器。

## 简单饰品：只写形状和绑定

```ts
import {defineAttachment} from '@mofli/core';

export const attachment = defineAttachment({
  id: 'soft-gem',
  mount: 'head.forehead',
  slot: 'head.overlay',
  parameters: {size: {min: .6, max: 1.4, default: 1}},
  scaleParameter: 'size',
  scene: {
    version: 1,
    nodes: [{
      id: 'gem',
      geometry: {kind: 'ellipse', cx: 0, cy: 0, rx: .15, ry: .18},
      attrs: {fill: '#dfcdab'},
      surface: true,
    }],
  },
});
```

这份 scene 是可序列化的数据。局部单位是头部半径；size 先缩放局部几何，再由骨架挂载投影。没有 `project()`、屏幕坐标、DOM 或相机计算。

- `member: 'left'` / `'right'` 选择成对挂载中的成员，一个饰品可同时声明两侧。
- `surface: true` 将局部路径采样到骨架声明的曲面区域，用于腮红、花纹。
- 默认使用挂载局部空间进行投影。普通平面饰品可以选择 `space: 'flat'`，保留原生 SVG path / ellipse / rect，并由挂载矩阵变换；flat 不支持成员、曲面、mesh 或运动。
- `attrs` 目前只接受 fill 和可选 opacity。不是任意 SVG 文档导入器。

### 路径

`geometry: {kind: 'path', d: 'M ... C ... Z'}` 支持显式的绝对 `M/L/Q/C/Z`，单个闭合轮廓。多个轮廓使用多个节点。投影模式不接受弧线 A、相对命令、隐式重复参数及复合子路径，遇到这些输入明确报错；不要默默当成另一条路径。

也可使用 ellipse、圆角 rect、polygon、roundedPolygon 或结构化 cubic。采样在 core 中完成。flat 模式保留原生路径字符串，可使用浏览器支持的 SVG path 语法，但它只能作为平面投影。

## 声明运动

挂坠节点增加：

```ts
motion: {kind: 'sway', amplitude: .14, frequency: 2.15, lag: .2}
```

core 围绕局部原点摆动，补偿头部倾斜并加入末端延迟；左右成员默认错相。可配置 phase。它是确定性动画，不是真实惯性物理模拟。关闭动态时，宿主运行时传入零时间，饰品运动随之冻结。

静态轮廓及 motion 可以直接存成数据。需要程序生成布局或特殊轨迹时，scene 也可写成 `({time, parameters}) => ({version: 1, nodes: [...]})`。该函数拿不到挂载投影器，输出仍然是局部场景数据。`attachmentSceneBuilder` 是可选的数据编排助手，不执行渲染。内置 20 款饰品现在全部使用 JSON，包括泡泡、萤火和花瓣。

## 有体积的饰品

二维轮廓不能推断背面。帽子等额外声明支持的体积结构：

- `lathe`：半径 / 高度截面与各段颜色。
- `torus`：主半径、管宽、管高与各段颜色。
- `disc`：半径、颜色。
- 高级作者可提供局部三维顶点构成的 faces。

这些结构置于 `{kind:'mesh', id:'surface-', faces:[...]}` 中，可选 `cull:'negative'` / `'positive'` 约定正面投影绕序。core 统一生成网格、投影、在同一个 mesh 内按平均深度排列面。需要互相排序的部件放入同一个 mesh。

参考 `packages/grove/src/accessories/hat.ts`：礼帽只声明截面、圆环、底面和颜色，不再包含网格遍历、投影、路径拼接及深度排序。

这仍是受约束的 2.5D 系统。平均深度排序不解决任意相交面、角色与饰品间的通用遮挡，也不会自动规避其他饰品。优先用前景平面或主动悬空造型。

## 扩展边界

旧 `Attachment.sample(context, parameters)` 继续作为高级兼容入口。内置 20 款饰品和新 CLI 模板均使用 `defineAttachment`。新作者应优先使用声明式接口；新增通用投影能力应在 core 扩展，挂载形变能力在骨架扩展，而不是复制到饰品中。

静态 scene 可序列化不等于整个 npm 插件安全：包仍可执行任意受信任代码，Mofli 不提供不可信插件沙箱。

## 纯数据数值通道

scene 可声明 variables 和 channels。通道将计算结果写入 nodes 中已有的数值属性，引用 time、parameter 或 variable；支持 add/sub/mul/div/mod/sin/cos/pow/min/max。这是有限的表达式数据，不接受代码字符串，不使用 eval。未知参数、循环变量、非法路径和非有限结果会报错。

```ts
channels: [{
  path: ['nodes', 0, 'geometry', 'cx'],
  value: {op: 'mul', args: [.1, {op: 'sin', args: [{time: true}]}]}
}]
```

localTransform 声明局部二维变换，通道可驱动平移和旋转。静态形状无需通道。包的组织与数据协议独立，详见 [资源包指南](resource-packs.md)。
