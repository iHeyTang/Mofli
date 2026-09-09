# Mofli

[English](README.md) | **简体中文**

框架无关的交互式 SVG 宠物引擎。使用骨架、皮肤和饰品组装宠物，在 Studio 中预览、调整并导出到自己的项目。

需要 Node.js 22.12 或更新版本。

## 开箱组装宠物

```sh
npx @mofli/studio
```

打开终端显示的地址，选择 Grove 内置资源、调整参数并保存宠物 JSON。需要开发自己的资源和导出运行包时，创建下面的独立项目。

## 在 Studio 中开发自己的资源

创建自己的项目，在该项目中启动 Studio，你实现的皮肤和饰品就会出现在工作台素材库里，可以直接预览、组装和调试。

```sh
# 创建项目并安装依赖
npx @mofli/studio init my-pack --type pack

# 进入自己的项目，启动带有项目资源的 Studio
cd my-pack
npm run dev
```

脚手架会生成以下项目结构，配置已就绪：

```text
my-pack/
├── src/index.ts       # 你的资源实现与集合导出
├── mofli.project.ts   # 告诉 Studio 加载哪个资源集合
├── package.json      # 项目依赖和启动、导出命令
└── tsconfig.json     # TypeScript 配置
```

打开终端显示的地址，Studio 中已经能看到模板提供的自定义皮肤和饰品。修改 `my-pack/src/index.ts`，工作台会自动重新加载并展示修改后的效果。

启动时，Studio 会读取当前项目根目录的 `mofli.project.ts`。脚手架已将它配置为加载 `src/index.ts` 导出的资源集合；继续往这个集合里添加骨架、皮肤或饰品即可，无需修改 Studio 源码。

在工作台中搭配宠物，点击“保存到项目”，再在 `my-pack` 目录运行：

```sh
npm run check        # 校验资源与宠物配置
npm run export:pet   # 导出可接入业务项目的宠物运行包
```

只开发皮肤或饰品时，创建命令可改用 `--type skin --rig bloub`、`--type skin --rig mew` 或 `--type attachment`。详细步骤见 [创作者工作流](docs/creator-workflow.md)。

## 在业务项目中使用

在你的业务项目目录安装运行依赖：

```sh
npm install @mofli/core @mofli/grove
```

注册资源集合并加载 Studio 保存的宠物配置：

```ts
import { PetRegistry } from '@mofli/core';
import { createPet } from '@mofli/core/browser';
import { grovePack } from '@mofli/grove';

const registry = new PetRegistry().registerPacks(grovePack);
const pet = createPet({ container, registry, config });

pet.setMood('happy');
// 页面或组件卸载时释放资源。
pet.destroy();
```

`container` 是有宽高的 DOM 元素，`config` 是宠物 JSON 对象。宿主也可直接使用 CLI 导出的浏览器运行包。

## SDK 文档

- [创作者工作流](docs/creator-workflow.md)：创建项目、工作台开发、保存与导出。
- [资源包](docs/resource-packs.md)：组织和注册骨架、皮肤、饰品。
- [架构](docs/architecture.md)：各层职责、执行模型与约束。
- [皮肤开发](docs/skin-authoring.md)：外观、几何默认值和表面花纹。
- [饰品开发](docs/attachment-authoring.md)：挂载接口、SVG 场景与数据动画。
- [宠物配置](docs/pet-config.md)：保存格式和宿主接入。
- [绑定工具](docs/bindings.md)：局部坐标、曲面投影与关节链。

## 修改 Mofli 源码

维护 Core、Grove 或 Studio 的实现，请阅读 [源码开发指南](CONTRIBUTING.md)。其中的 workspace 安装、构建与测试命令仅用于 Mofli 仓库。

## 运行边界

Mofli 是受约束的 SVG / 2.5D 引擎，不提供任意三维物体相交或碰撞求解。资源包代码按可信代码执行，没有不可信插件沙箱。Core 默认入口不依赖 DOM；浏览器能力通过 `@mofli/core/browser` 使用。

## 来源与致谢

Mofli 最初受到 [Bloub](https://github.com/jeremy-prt/bloub) 的启发。感谢作者 **Jérémy Perret** 开源分享 SVG 角色的形态变换、眼睛动画与头部朝向实现，为 Mofli 的探索提供了基础。

Mofli 中的 Bloub 骨架、Mew 骨架的部分实现，以及 Core 中提取的轮廓与面部计算代码，包含对 Bloub 源码的使用和改编。这些部分保留原作者版权 **Copyright (c) 2026 Jérémy Perret**，遵循 **MIT License**；具体来源、版本及完整许可文本见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

Bloub 复现的是 x.ai / Grok 的机器人形象。其 MIT 许可适用于代码，不代表对原角色设计或商标的授权；相关设计与商标归各自权利人所有。Mofli 与 x.ai 无隶属或背书关系。
