# 完整宠物配置（v1）

宠物的可保存定义 = 一个皮肤 + 零到多个饰品 + 实例参数。皮肤的 `rig` 指定它需要的骨架；不必让使用者再选一次骨架。配置本身是数据，不增加一个可执行的“宠物包”层。

## 配置

`PetConfig` 包含 `version: 1`、完整 `skin`、`rigConfig`、`pose` 和 `attachments`。每个饰品引用包含实例 `id`、实现 `type`、`version: 1` 以及可选数值 `parameters`。实例 ID 会保留，多个饰品不能占用同一排他挂载接口。

保存的是角色定义与当前选择的姿态，不保存动画时钟、鼠标位置或正在进行的短暂点击动作。恢复从时间 0 开始。配置不会自动下载或执行外部代码；宿主必须先注册可信骨架和饰品实现。缺失实现、版本不支持、非法参数或挂载冲突会报错。

## 浏览器接入

```ts
import { PetRegistry } from '@mofli/core';
import { createPet } from '@mofli/core/browser';
import { bloubRig } from '@mofli/grove/rigs/bloub';
import { hat } from '@mofli/grove/accessories/hat';
import { bow } from '@mofli/grove/accessories/bow';

const registry = new PetRegistry()
  .registerRig(bloubRig)
  .registerAttachment(hat)
  .registerAttachment(bow);
const pet = createPet({ container, registry, config: JSON.parse(savedJson) });
// 默认绑定鼠标和键盘；宿主也可调用 setMood / setActivity / setPose。
const savedAgain = JSON.stringify(pet.exportConfig());
// 卸载：pet.destroy();
```

不需要浏览器自动循环时，使用 `registry.create(config)`，通过返回的 `engine` 处理外部事件，通过 `sample(time)` 获取含饰品的 Frame，通过 `exportConfig()` 保存。也可使用 `createPet({container, rig, skin})` 直接加载骨架与皮肤。

Studio 可将配置保存到项目的 `pet.json` 或下载为 JSON，也支持导入和本地恢复。验证失败不会替换当前宠物。保存与导出流程见 [创作者工作流](creator-workflow.md)。
