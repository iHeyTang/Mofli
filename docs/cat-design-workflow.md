# 猫头设计母版 / 第 01 轮

预览：`/design.html`。母版位于 `apps/studio/cat-studies/`，9 份独立 SVG 及同源的 `masters.json`。A 软团、B 圆角猫、C 枕头猫；每组正面、四分之三侧面、侧面。用户已选定 A 软团。原型以该正面 SVG 为取样母版，统一头耳轮廓；B/C 留作比较。侧面母版尚未完整转换为运行时转面控制。

这轮先比较剪影、耳长/耳宽、脸颊宽度和缩小可读性。单个头部用闭合路径表达，避免用两个悬浮耳朵拼出静态造型。眼睛仅作为朝向和表情比例的参考。侧面是二维设定，不宣称三维投影准确性。

选择方向后：

1. 完善该方向的转面设定及远耳遮挡，固定耳根、额头、眼位和脸颊的关系。
2. 将母版拆成身体与耳部控制，检查重合处的闭合和遮挡；母版是比较标准。
3. 制作中间朝向和竖耳、压耳关键姿态，再定义一致拓扑及允许的运动范围。
4. 逐步接回 Bloub 形态。每次检查正常尺寸、放大剪影和慢速转场；代码测试不代替造型评价。

参考工作方法：
- https://github.com/molauu/svg-character-animator/blob/main/SKILL.md
- https://inkscape-manuals.readthedocs.io/en/latest/node-types.html
- https://docs.toonboom.com/help/harmony-20/essentials/getting-started/character-building.html

只借鉴设计顺序与动画组织方法，未引入这些项目的运行时或安装第三方 skill。
