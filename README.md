# Mofli

框架无关的交互式 SVG 宠物引擎。使用骨架、皮肤和饰品组装宠物，在 Studio 中预览、调整并导出到自己的项目。

## 项目结构

| 包 | 职责 |
| --- | --- |
| `@mofli/core` | 资源协议、校验、事件、动画、挂载与 SVG 渲染 |
| `@mofli/grove` | 官方资源集合：2 个骨架、6 款皮肤、20 款饰品 |
| `@mofli/studio` | 基于 React、HeroUI 和 TanStack 的工作台与 CLI |

一个 npm 资源包可以同时提供多种骨架、皮肤和饰品。开发者可以只依赖 Core，也可以扩展 Grove 提供的资源。

## 启动开发

需要 Node.js 22.12 或更新版本。各包目前为 private，尚未发布到 npm。

```sh
npm install
npm run studio
```

打开终端显示的地址即可组装宠物。开发 Studio 界面时使用 `npm run dev`。

```sh
npm test                 # 构建并运行单元测试
npm run typecheck        # 类型检查
npm run build:studio     # 构建工作台
npm run test:packages    # 隔离安装、打包和创作者流程验证
MOFLI_BROWSER_CHANNEL=chrome npm run test:browser
```

## 在项目中使用

安装相应包后，注册资源集合并加载 Studio 保存的宠物配置：

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

## 开发文档

- [创作者工作流](docs/creator-workflow.md)：创建项目、工作台开发、保存与导出。
- [资源包](docs/resource-packs.md)：组织和注册骨架、皮肤、饰品。
- [架构](docs/architecture.md)：各层职责、执行模型与约束。
- [皮肤开发](docs/skin-authoring.md)：外观、几何默认值和表面花纹。
- [饰品开发](docs/attachment-authoring.md)：挂载接口、SVG 场景与数据动画。
- [宠物配置](docs/pet-config.md)：保存格式和宿主接入。
- [绑定工具](docs/bindings.md)：局部坐标、曲面投影与关节链。

## 运行边界与许可

Mofli 是受约束的 SVG / 2.5D 引擎，不提供任意三维物体相交或碰撞求解。资源包代码按可信代码执行，没有不可信插件沙箱。Core 默认入口不依赖 DOM；浏览器能力通过 `@mofli/core/browser` 使用。

Bloub 衍生实现保留 MIT 归属声明，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
