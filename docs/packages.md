# 1 + N + M 包架构

## 项目边界

每个 `packages/*` 都是独立 npm 项目，拥有自己的 `package.json`、`tsconfig.json`、`src` 和 `dist`。没有跨包相对源码引用、共享编译配置或 workspace 专用版本协议。源码可以复制到单独仓库；本地 monorepo 只是一起开发与验证的管理方式。本轮没有创建远程仓库或发布 npm 包。

- 核心：定义“如何运行与渲染一个骨架”，不知道角色名称、形状、状态列表或皮肤目录。
- 骨架：只依赖核心，定义拓扑、设计空间、几何约束、绑定准备、动作、连续性以及皮肤创建入口。不能引用其他骨架或皮肤。
- 皮肤：一款皮肤一个包，只直接依赖一个骨架，通过其导出的工厂/类型定义外观。不能绕到核心或跨骨架装配。
- 宿主：可依赖核心及多个皮肤/骨架，按需要注册和展示。演示页的预设聚合留在客户端。

## 为什么骨架用 peer dependency

骨架声明兼容的核心范围 `^0.1.0`，由宿主安装符合范围的核心实例，避免每个骨架私藏一套不同版本。皮肤声明其兼容骨架范围 `^0.1.0`。皮肤仍会传递依赖核心，但其源码、类型声明和直接依赖只面向自己的骨架。包版本兼容范围和运行时的 Rig ID / protocol version 各管一层；破坏性接口变化必须调整版本范围。

当前所有包暂时同版本只是首次拆包结果，不要求以后同步发版。包保持 private；将来拆仓库后需要通过私有 registry 或本地 tarball 提供尚未发布的依赖。

## 骨架项目最小示例

```json
{
  "name": "@example/rig-orb",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "peerDependencies": { "@mofli/core": "^0.1.0" }
}
```

```ts
import { defineSkin, type Rig, type SkinInput } from '@mofli/core';
export type { Skin, SkinInput, PetDefinition } from '@mofli/core';

export const orbRig: Rig = {
  id: 'orb', version: 1, name: 'Orb',
  colors: { body: '#456B58' },
  parameters: { radius: { min: 30, max: 80, default: 60 } },
  sample({ skin }) {
    const r = skin.parameters.radius!;
    return {
      shapes: [{ id: 'body', kind: 'ellipse', attrs: {
        cx: 160, cy: 160, rx: r, ry: r, fill: skin.colors.body!,
      }}],
      anchors: [], bounds: { x: 160-r, y: 160-r, width: 2*r, height: 2*r },
    };
  },
};
export const defineOrbSkin = (input: SkinInput) => defineSkin(orbRig, input);
```

这是协议示例，不是完整有生命感的角色。实际骨架需要实现并测试自己的准备阶段、动作空间、绑定及姿态过渡。

## 皮肤项目

皮肤包 manifest 只声明一个骨架 dependency。源码只导入该骨架：

```ts
import { orbRig, defineOrbSkin, type Skin, type PetDefinition } from '@example/rig-orb';
export const skin: Skin = defineOrbSkin({ id: 'mint', name: 'Mint', colors: { body: '#8EBBA4' } });
export const pet: PetDefinition = { rig: orbRig, skin };
```

`defineSkin` 补全默认值并执行 `validateSkin` 与可选 `prepare`；运行时实例仍会重新 prepare，避免共享每个实例的可变控制器。自定义骨架可以给工厂提供更具体的参数类型，调用自身约束校验。皮肤包仍是安装的 JS 模块，不等于不可信 JSON 沙箱。

命名皮肤的配色与参数位于皮肤包；骨架内的默认颜色/参数只是协议槽与合法缺省值，不能反向从皮肤包读取。

## 本次迁移

| 旧入口 | 新入口 |
| --- | --- |
| mofli | @mofli/core |
| mofli/browser | @mofli/core/browser |
| mofli/rigs/bloub（算法） | @mofli/rig-bloub |
| mofli/rigs/bloub（bloubSkin） | @mofli/skin-bloub |
| mofli/rigs（presets） | 各皮肤包，由宿主聚合 |

旧的单包入口被移除，根项目现在只是 workspace 工具。Bloub 的参考算法保留在 `rig-bloub` 内，没有尝试把特定角色的测量常数移入核心。

## 验收方式

`test/packages.test.mjs` 检查各包的 manifest 与源码 import/export，阻止反向依赖、未声明依赖和跨包相对源码引用。`scripts/check-packages.mjs` 把每个项目源码复制到仓库外，安装已经打包的依赖、独立编译，然后在新的消费项目安装所有 tarball，通过公开 exports 运行全部三款皮肤，并验证每个皮肤包只导出一款皮肤及对应 PetDefinition。参考动画的 196 种切换、中断、精度和浏览器像素测试继续保留。

## 独立预览项目与皮肤拆分

`examples/studio` 是 `@mofli/studio`，自带 Vite、TypeScript 开发依赖和 dev/build/preview/typecheck 命令，构建输出到自己的 `dist/`。根目录的 dev/build:demo 仅用于先构建库再转发命令。移除 studio 不影响库构建；库构建顺序由 manifest 依赖图自动计算。

原 `@mofli/skin-cat-head` 已拆为 `@mofli/skin-cat-ink`（sesame/sesamePet）与 `@mofli/skin-cat-patches`（patches/patchesPet）。旧聚合包被移除，宿主自行组合列表。几何参数变体不自动成为新皮肤。

`npm run test:packages` 为每个库在临时目录安装声明的工具链和打包依赖，执行自己的 build/typecheck，再打包其独立构建产物。随后复制 studio 到另一个临时目录，仅安装已打包的库和自身工具链，检查类型并构建首页和设计页。全程不引用仓库内 node_modules 或源码别名。

软体、机械实验骨架及对应皮肤已移除。当前为 1 个 Core、2 个骨架、3 个皮肤及 1 个 Studio。通用圆润轮廓的变化由现有 Bloub/猫头骨架的参数表达。
