# Mofli

框架无关的 SVG 角色引擎。逻辑上分为核心、骨架、皮肤和饰品；npm 项目分为 core、官方集合 official，以及独立的 Studio 应用。全部暂为 private，尚未发布。

| 包 | 内容 | 运行依赖 |
| --- | --- | --- |
| @mofli/core | 协议、校验、事件、挂载、动画和渲染 | 无资源依赖 |
| @mofli/grove | 2 个骨架、6 款皮肤、20 款纯数据饰品 | core |
| @mofli/studio | 工作台与 CLI | core、official |

开发者可以只用 core 实现自己的骨架、皮肤和饰品；也可以从 official 导入现有骨架、皮肤工厂与饰品，在自己的资源包中扩展。包名不决定资源兼容性。

```ts
import {PetRegistry} from '@mofli/core';
import {grovePack} from '@mofli/grove';
const registry = new PetRegistry().registerPacks(grovePack);
```

`core/browser` 是核心包的浏览器入口；默认 `core` 入口不读取 DOM。核心不内置骨架目录，也不会自动注册具体角色。实验宠物保持原有实验定位，并非本轮新增的视觉作品。

## 本地开发

```sh
npm install
npm run studio          # 构建库后启动正式 Studio；自动发现本地创作者项目
npm run dev             # Studio 应用自身的 Vite 开发服务器
npm test                # 构建及核心、参考动画、依赖边界测试
npm run typecheck       # 各包与演示客户端类型检查
npm run build:studio    # 构建正式应用，输出 apps/studio/dist/
npm run build:demo      # 兼容旧构建命令
npm run test:packages   # 仓库外逐包构建、打包、安装并运行消费项目
MOFLI_BROWSER_CHANNEL=chrome npm run test:browser
```

修改包源码后运行 `npm run build` 更新其 `dist/`；演示页通过真实包 exports 加载产物，不使用源码路径别名。独立构建某包：`npm run build --workspace @mofli/grove/rigs/bloub`，前提是核心已构建。

## 使用皮肤包

```ts
import { createPet } from '@mofli/core/browser';
import { bloubPet } from '@mofli/grove/skins/bloub';

const pet = createPet({
  container: document.querySelector('#pet')!,
  ...bloubPet,
});
// 卸载组件时：pet.destroy();
```

`bloubPet` 是 `{ rig, skin }`，由皮肤包装配；不要求宿主再次手工查找骨架。需要自己管理时钟时使用 `PetEngine` 和 `createSvgRenderer`。渲染器支持带实例命名空间的 mask、linearGradient 和类型化变换，不接受直接注入 SVG 字符串。

## 新建一个皮肤包

皮肤项目只声明 `@mofli/grove/rigs/bloub` 依赖，通过骨架提供的工厂创建数据：

```ts
import {
  bloubRig, defineBloubSkin,
  type Skin, type PetDefinition,
} from '@mofli/grove/rigs/bloub';

export const skin: Skin = defineBloubSkin({
  id: 'sage', name: 'Sage',
  colors: { body: '#456B58', paper: '#F7F4EC' },
});
export const pet: PetDefinition = { rig: bloubRig, skin };
```

骨架工厂固定 Rig ID、补全并校验颜色槽。Skin 包含外观和可选 rigConfig 默认几何配置，状态和表情通过 pose 设置。猫头现支持受约束的表面花纹和眼睛样式，骨架负责投影、形变与遮挡；任意纹理和材质尚未实现。见 [表面皮肤协议](docs/surface-skins.md)。

## 新建一个骨架包

骨架项目声明 `@mofli/core` peer dependency，导出符合 `Rig` 的实现、自己的皮肤工厂，以及供皮肤作者使用的类型。具体规则和独立项目示例见 [包架构](docs/packages.md)。

结构、动作、约束和过渡属于骨架。`Rig.updateSkin` 可接管姿态过渡；缺省时使用核心的兼容路径插值/不兼容帧淡化。一个骨架的球面投影或 64 点轮廓不是所有骨架必须遵守的模型。

## 来源与边界

`rig-bloub/src/vendor` 是保留来源及 MIT 许可的 Bloub 核心动画移植，包含我们的状态控制器 fork 和小坐标路径精度修复。拆包没有把这些算法变成 Mofli 原创算法。许可随参考骨架和皮肤包分发，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 [参考集成说明](docs/bloub-reference.md)。

Rig 是可信可执行代码；当前没有不可信插件沙箱。引擎支持当前事件快照下的确定性采样，不是完整历史事件重放。通用过渡不承诺速度连续。当前没有四足 IK、通用骨架编辑器或 Amiba 插件适配。




## 当前主展示：Bloub 与猫头

主展示统一提供 Bloub 参考骨架和猫头骨架。三款皮肤均可从主页面按骨架选择。猫头完整移植 Bloub 的 14 个状态，身体、五官和装饰采用带 MIT 声明的参考计算，增加随轮廓变形和按状态收拢的猫耳。旧的五状态猫头已替换，无鼻子、胡须。墨黑皮肤保留耳长和脸型调整，不为参数变体单独提供皮肤。

猫头包仅依赖 core，内部包含独立的参考实现，不导入其他骨架包。当前参数和限制见 [猫头骨架说明](docs/cat-head.md)。

## 配置分层

皮肤可以携带 rigConfig 默认几何值。换肤应用外观和几何，保留当前动作与表情。exportSkin 保存调整后的外观与几何。没有独立骨架预设概念，见 [分层协议](docs/character-layers.md)。

绒石皮肤 `@mofli/grove/skins/mofli-stone` 使用 Bloub 骨架新增的 `variants.eyes: "socket"` 能力。五官投影、眼睑裁剪和瞳孔边界由骨架管理；皮肤只提供外观配置。当前动作仍沿用 Bloub。

Studio 已提供糯团、芽豆、绒石三款独立皮肤。骨架支持三组 64 角度母版，以及受限的眼睛宽高、间距、静候朝向配置；原 Bloub 默认配置保持不变。静候与基础身体状态使用母版，特殊符号/粒子状态仍沿用现有动作，不等同于三套全新动画。

完整宠物支持 JSON 保存、导入与本地恢复；可通过公共 `PetRegistry` 和浏览器 `createPet({container, registry, config})` 加载一个皮肤与多个饰品。协议、分层职责与接入示例见 [完整宠物配置](docs/pet-config.md)。

创作者入口与独立分发流程见 [创作者工作流](docs/creator-workflow.md)：`mofli init` 创建皮肤或饰品包，`mofli dev` 加载项目源码，在 Studio 保存到项目后通过 `mofli export` 输出可嵌入的 ESM 宠物运行包。


## Studio 应用

`apps/studio` 是独立的 `@mofli/studio` npm 应用包，不是 examples。React 19 管理界面、HeroUI 3 提供默认控件和主题、TanStack Router 管理创作／项目页面、TanStack Query 管理保存与导入。动画帧保持在 Core 与 SVG renderer 中，不经过 React 全局状态更新。

发布后 `npx @mofli/studio` 无参数即可启动内置工作台。在包含 `mofli.project.ts` 的目录执行时自动加载该项目；也可使用 `npx @mofli/studio --project ./my-pet`。当前尚未发布，本地用 `npm run studio`。

旧 `reference.html` 仅保留为 Bloub 参考回归测试夹具，不是默认首页。React 工作台与创作者工作流有独立浏览器测试。

饰品目录现有 7 类挂载、20 款饰品。详见 [挂载接口与组合](docs/accessory-mounts.md)。

饰品开发采用声明式场景协议：参见 [饰品编写指南](docs/attachment-authoring.md)。局部路径、曲面绑定、摆动与体积结构由 core 统一渲染，骨架提供挂载约束。

资源与 npm 包已解耦：一个包可包含多种骨架、皮肤和饰品，参见 [资源包指南](docs/resource-packs.md)。全部官方资源收录为 `@mofli/grove`；20 款饰品的定义全部保存为 JSON。
