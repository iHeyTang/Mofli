# npm 资源包

本文用于在你自己的 npm 项目中扩展 Mofli。创建项目使用 [创作者工作流](creator-workflow.md)；维护 Grove 本身请阅读 [源码开发指南](../CONTRIBUTING.md)。

资源种类与 npm 包独立。一个 npm 包可以导出任意数量的骨架、皮肤、饰品，也可以导出多个 ResourcePack；包内是否拆文件由作者决定。

```ts
import {defineResourcePack} from '@mofli/core';
export const pack = defineResourcePack({
  id: 'my-collection',
  version: 1,
  rigs: [blobRig, catRig],
  skins: [greenBlob, creamCat],
  attachments: [
    {name: 'Flower', attachment: flower},
    {name: 'Bow', attachment: bow},
  ],
});
export default pack;
```

rigs、skins 和 attachments 字段均可省略。饰品定义可以从 JSON 读取后交给 defineAttachment，也可以使用高级函数定义。骨架仍是受信任的可执行实现，混合资源包并不意味着骨架可全部改成静态数据。

## 工作台与 CLI

`mofli.project.ts`：

```ts
import pack from 'my-collection';
export default {packs: [pack], defaultSkin: 'my-skin-id'};
```

运行 `npx @mofli/studio init my-collection --type pack` 创建包含两种骨架、两款皮肤和一个饰品的包模板。

项目通过 packs 声明资源集合。Studio、CLI check 和导出后的运行时使用同一资源收集入口，避免工作台能用但导出丢资源。

## 运行时

```ts
const registry = new PetRegistry().registerPacks(packA, packB);
const pet = registry.create(savedPetConfig);
```

依赖的包一起注册，顺序不影响跨包皮肤引用。相同类别的不同资源不能使用相同 ID；同一个资源对象可被不同集合共同引用。资源包 ID 不可重复。发生冲突时注册失败，不会部分写入。

皮肤按 skin.rig 与骨架协议校验，而不是按 npm 包名匹配。饰品按 mount / slot / 参数契约在实际组合时校验，不要求依赖某个具体骨架包。注册资源不意味着每件饰品都与每个骨架兼容。

## 官方集合包

Grove 的骨架、皮肤与饰品实现位于 packages/grove，运行时只依赖 Core。

- `@mofli/grove` 主入口导出 grovePack（也为默认导出）、骨架及皮肤工厂。
- `@mofli/grove/rigs/bloub` 与 `rigs/mew` 提供骨架、约束和工厂。
- `@mofli/grove/skins/mofli-dough` 等子路径提供单款皮肤。
- `@mofli/grove/accessories` 统一导出饰品实例与 definitions；`@mofli/grove/accessories/sprout.json` 提供原始数据。
- JSON 定义位于 packages/grove/src/accessories。

### 基于官方资源扩展

```ts
import {defineResourcePack} from '@mofli/core';
import {bloubRig,defineBloubSkin} from '@mofli/grove';
const mySkin=defineBloubSkin({id:'my-mint',name:'Mint',colors:{body:'#567856'}});
export default defineResourcePack({id:'my-pack',version:1,rigs:[bloubRig],skins:[mySkin]});
```

也可只依赖 core，使用 Rig、defineSkin、defineAttachment、defineResourcePack 实现完全独立的集合。官方包是可选资源，不是开发第三方资源的必需依赖。官方不内置到 core。

Studio 自带资源作为默认值，显式项目包可替换同 ID 的内置资源；项目包之间的冲突仍报错。直接使用 PetRegistry 不隐式替换资源。
