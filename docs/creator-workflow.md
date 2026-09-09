# Mofli 创作者工作流

目标：创作者只维护自己的源码包；Studio 自动加载源码，输出可编辑配置或可直接运行的宠物。

## 包与命令

- `@mofli/core`：宿主运行基础设施，无 Studio、Vite 或框架依赖。
- `@mofli/grove`：统一提供 2 个骨架、6 款皮肤与 20 款纯数据饰品，只依赖 Core。
- 第三方集合：可仅基于 Core 开发，也可导入官方资源扩展；通过 ResourcePack 在同一个 npm 包中提供多类资源。
- `@mofli/studio`：独立创作工具包，提供 `mofli` CLI；作为创作者项目的开发依赖，不进入其运行时依赖。

不为每个皮肤再提供一个独立命令。统一命令负责加载这些包，避免用户需要学习不同工具。

当前这些包尚未公开发布。下面的 `npx @mofli/studio` 是发布后的入口；仓库中可以使用 `node apps/studio/bin/mofli.mjs`，隔离验证使用真实 npm tarball。包保持 private，未执行 npm publish。

## 直接启动 Studio

发布后在任意目录执行 `npx @mofli/studio` 即可打开内置工作台，无需先创建皮肤项目。在创作者项目目录执行会自动加载 `mofli.project.ts`；显式指定用 `npx @mofli/studio --project ./my-skin`。无参数启动已由本地 CLI 实现，但 npm 尚未发布。

Studio 位于 `apps/studio`，采用 React、HeroUI、TanStack Router 与 Query，作为正式应用独立构建与打包。

## 从零创建

要求 Node.js 22.12 或更新版本。

```sh
npx @mofli/studio init my-skin --type skin --rig bloub
cd my-skin
npm run dev
```

`init` 默认安装依赖；可用 `--no-install` 分离创建与安装。已有目录会拒绝覆盖。猫头使用 `--rig cat-head`。

饰品使用同一流程：

```sh
npx @mofli/studio init my-accessory --type attachment
cd my-accessory
npm run dev
```

生成的内容：

- `src/index.ts`：皮肤或饰品实现，带类型提示与可运行示例。
- `mofli.project.ts`：只用于开发装配，声明本地源码与已安装包。
- `package.json`：独立包导出、运行依赖、Studio 开发依赖与命令。
- `tsconfig.json`：构建 ESM 与类型声明。

运行 `npm run dev` 后打开终端显示的本机地址。端口被占用时会明确报错；使用 `npm run dev -- --port 4175` 更换端口。

## 在工作台开发

编辑 `src/index.ts`，Studio 自动重新加载。选中的皮肤、手动调整的参数和饰品保留在当前标签页；源码新增默认值会生效，旧参数不兼容时回到项目默认配置。编译失败由开发服务器显示错误。

Studio 自动列出项目声明的皮肤、饰品和饰品数值参数。可以把源码模块替换为 npm 包导出：

```ts
import { pet } from './src/index.js';
import { attachment } from 'my-accessory';
import type { StudioProject } from '@mofli/studio';

export default {
  pets: [pet],
  attachments: [{ name: '我的饰品', attachment }],
  defaultSkin: pet.skin.id,
  defaultAttachments: [attachment.id],
} satisfies StudioProject;
```

`my-accessory` 需要先安装到创作者项目。每个皮肤导出 `{rig, skin}` 装配定义，避免让用户手动匹配骨架。外部骨架也可经 `pets` 注册；当前提供通用参数与姿态预览，Bloub／猫头具有专门的图形选项面板。

同一个排他挂载接口不能同时佩戴两个饰品；工作台拒绝冲突并显示原因。未知饰品不再需要修改 Studio 源码注册。

## 保存、导出、接入

工作台顶部“保存到项目”会校验完整装配并写入项目根目录 `pet.json`。这不会改写皮肤或饰品源码；源码包和最终装配是不同产物。

```sh
npm run check
npm run export:pet
```

导出默认读取 `pet.json`，生成 `pet-runtime/`：

- `pet.mjs`：包含骨架、饰品和 Core 的浏览器 ESM 运行包。
- `pet.d.ts`：常用接入接口类型。
- `pet.json`：可继续编辑的配置。
- `index.html`：最小接入示例。
- `package.json`：可独立打包的运行包入口。
- `THIRD_PARTY_NOTICES.md`：内置实现的上游归属说明。

```js
import { mountPet } from './pet-runtime/pet.mjs';
const pet = mountPet(document.querySelector('#pet'));
pet.setMood('happy');
// 卸载页面或组件时：pet.destroy();
```

容器需设置宽高。鼠标与键盘响应由运行包提供，宿主可通过返回的 API 控制姿态和活动；React、Vue 或原生页面都可以使用。示例通过 HTTP 开发服务器打开，不能依赖浏览器的 file:// 模块加载。

导出目录已存在时拒绝覆盖。再次导出用 `npx mofli export --out pet-runtime-v2`，或自行清理旧产物。下载的 JSON 也可以直接传入 `npx mofli export /path/to/pet.json`。

JSON 本身只含数据，需要宿主注册相应实现；运行包已经携带实现，适合直接交付。源码里的 npm 包可以复用到多个宠物；导出的运行包对应一份具体装配。

## 发布前

`npm run check` 校验源码与装配，`npm pack --dry-run` 检查源码包分发内容。脚手架默认 private，需要作者确定 npm 名称、版本和许可证后再发布。不要把 Studio 列入皮肤／饰品的运行时 dependencies。

自定义第三方源码或素材的许可证由作者确认，并补充项目归属说明；工具不会替作者授权。配置不会下载未知代码；项目模块和骨架／饰品代码作为可信本地开发代码执行。

当前导出未做按角色精简所有内置实现，也没有压缩素材资源管理、账户或在线素材市场。这些不影响本地创作、独立打包和宿主运行闭环。
