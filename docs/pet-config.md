# 完整宠物配置（v1）

宠物的可保存定义 = 一个皮肤 + 零到多个饰品 + 实例参数。皮肤的 `rig` 指定它需要的骨架；不必让使用者再选一次骨架。配置本身是数据，不增加一个可执行的“宠物包”层。

## 职责

- Core：配置校验与注册表、时间与事件、过渡、SVG 渲染和饰品组合。
- 骨架：支持的控制空间、轮廓与五官变形、状态运动、挂载坐标系及其投影。
- 皮肤：角色轮廓、五官样式数据、颜色和骨架默认配置。糯团、芽豆、绒石各自携带 64 点轮廓及 19 对眼睛定义；骨架验证这些数据并统一执行过渡。
- 饰品：自己的几何、颜色与安装参数。帽子的悬空高度属于帽子；底层不执行碰撞避让。领结按下前方挂载坐标系投影。
- Studio：公共 SDK 的配置编辑器，不是运行时依赖。

骨架仍保留旧版无 `design` 配置的兼容样式；新版三款皮肤优先使用自己的 `design` 数据。运动算法与可用运动类型仍属于骨架。

## 配置

`PetConfig` 包含 `version: 1`、完整 `skin`、`rigConfig`、`pose` 和 `attachments`。每个饰品引用包含实例 `id`、实现 `type`、`version: 1` 以及可选数值 `parameters`。实例 ID 会保留，多个饰品不能占用同一排他挂载接口。

保存的是角色定义与当前选择的姿态，不保存动画时钟、鼠标位置或正在进行的短暂点击动作。恢复从时间 0 开始。配置不会自动下载或执行外部代码；宿主必须先注册可信骨架和饰品实现。缺失实现、版本不支持、非法参数或挂载冲突会报错。

## 浏览器接入

```ts
import { PetRegistry } from '@mofli/core';
import { createPet } from '@mofli/core/browser';
import { bloubRig } from '@mofli/rig-bloub';
import { hat } from '@mofli/attachment-hat';
import { bow } from '@mofli/attachment-bow';

const registry = new PetRegistry()
  .registerRig(bloubRig)
  .registerAttachment(hat)
  .registerAttachment(bow);
const pet = createPet({ container, registry, config: JSON.parse(savedJson) });
// 默认绑定鼠标和键盘；宿主也可调用 setMood / setActivity / setPose。
const savedAgain = JSON.stringify(pet.exportConfig());
// 卸载：pet.destroy();
```

不需要浏览器自动循环时，使用 `registry.create(config)`，通过返回的 `engine` 处理外部事件，通过 `sample(time)` 获取含饰品的 Frame，通过 `exportConfig()` 保存。原有 `createPet({container, rig, skin})` 接口继续可用。

Studio 的“保存宠物 JSON”同时下载文件并保存到当前浏览器本地；“导入宠物”加载 JSON；“恢复本地保存”恢复最近保存。验证失败不会替换当前宠物。帽子高度可在工具栏调整。
