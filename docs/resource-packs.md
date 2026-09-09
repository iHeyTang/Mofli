# npm 资源包

资源种类与 npm 包不再一一对应。一个 npm 包可以导出任意数量的骨架、皮肤、饰品，也可以导出多个 ResourcePack；包内是否拆文件由作者决定。

```ts
import {defineResourcePack} from '@mofli/core';
export const pack = defineResourcePack({
  id: 'my-collection',
  version: 1,
  rigs: [blobRig, catRig],
  skins: [greenBlob, creamCat],
  attachments: [
    {name: '花朵', attachment: flower},
    {name: '领结', attachment: bow},
  ],
});
export default pack;
```

字段均可省略。饰品定义可以从 JSON 读取后交给 defineAttachment，也可以使用高级函数定义。骨架仍是受信任的可执行实现，混合资源包并不意味着骨架可全部改成静态数据。

## 工作台与 CLI

`mofli.project.ts`：

```ts
import pack from 'my-collection';
export default {packs: [pack], defaultSkin: 'my-skin-id'};
```

发布后可运行 `npx @mofli/studio init my-collection --type pack` 创建包含两种骨架、两款皮肤和一个饰品的包模板。当前所有本地包仍 private，仓库内可用 `node apps/studio/bin/mofli.mjs init <目录> --type pack --no-install`。

已有 pets / attachments 项目配置兼容。新项目推荐 packs。Studio、CLI check 和导出后的运行时使用同一资源收集入口，避免工作台能用但导出丢资源。

## 运行时

```ts
const registry = new PetRegistry().registerPacks(packA, packB);
const pet = registry.create(savedPetConfig);
```

依赖的包一起注册，顺序不影响跨包皮肤引用。相同类别的不同资源不能使用相同 ID；同一个资源对象可被不同集合共同引用。资源包 ID 不可重复。发生冲突时注册失败，不会部分写入。

皮肤按 skin.rig 与骨架协议校验，而不是按 npm 包名匹配。饰品按 mount / slot / 参数契约在实际组合时校验，不要求依赖某个具体骨架包。注册资源不意味着每件饰品都与每个骨架兼容。

## 官方集合包

当前只有 core、official 两个库包，另有独立 Studio 应用。官方所有资源实际实现都位于 packages/grove 内，没有再依赖旧的骨架包、皮肤包或饰品包。

- `@mofli/grove` 主入口导出 grovePack（也为默认导出）、骨架及皮肤工厂。
- `@mofli/grove/rigs/bloub` 与 `rigs/cat-head` 提供骨架、约束和工厂。
- `@mofli/grove/skins/mofli-dough` 等子路径提供单款皮肤。
- `@mofli/grove/accessories/sprout` 等子路径提供单款饰品与纯数据 definition。
- JSON 定义位于 packages/grove/src/accessories/data。

### 基于官方资源扩展

```ts
import {defineResourcePack} from '@mofli/core';
import {bloubRig,defineBloubSkin} from '@mofli/grove';
const mySkin=defineBloubSkin({id:'my-mint',name:'Mint',colors:{body:'#567856'}});
export default defineResourcePack({id:'my-pack',version:1,rigs:[bloubRig],skins:[mySkin]});
```

也可只依赖 core，使用 Rig、defineSkin、defineAttachment、defineResourcePack 实现完全独立的集合。官方包是可选资源，不是开发第三方资源的必需依赖。官方不内置到 core。

旧未发布的 rig-*、skin-*、accessories 包已移除；保存的 PetConfig 资源 ID 不变。Studio 自带资源作为默认值，显式项目包可替换同 ID 的内置资源；项目包之间的冲突仍报错。直接使用 PetRegistry 不隐式替换资源。
