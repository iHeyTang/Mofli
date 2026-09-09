import { SHAPES, COLORS } from "./vendor/skins.js";
import { EXPRESSIONS } from "./vendor/expressions.js";
const shapeNames = [
  "圆形",
  "卵石",
  "圆角方形",
  "胶囊",
  "三角形",
  "六边形",
  "云朵",
  "水滴",
];
const expressionNames = [
  "自然",
  "专注",
  "惊讶",
  "兴奋",
  "开心",
  "大笑",
  "生气",
  "难过",
  "害怕",
  "怀疑",
  "困惑",
  "好奇",
  "得意",
  "害羞",
  "无聊",
  "困倦",
];
const colorNames = [
  "墨黑",
  "棕色",
  "红色",
  "橙色",
  "琥珀",
  "绿色",
  "青绿",
  "蓝色",
  "紫色",
  "粉色",
  "灰色",
  "奶油",
];
export const shapeOptions: { id: string; index: number; name: string }[] = [
  ...SHAPES.map((s, index) => ({
    id: s.id,
    index,
    name: shapeNames[index]!,
  })),
  ...[
    { id: "mofli-dough", index: 8, name: "糯团母版" },
    { id: "mofli-bean", index: 9, name: "芽豆母版" },
    { id: "mofli-stone", index: 10, name: "绒石母版" },
  ],
];
export const expressionOptions = [...EXPRESSIONS.map((s, index) => ({
  id: s.id,
  index,
  name: expressionNames[index]!,
})), {id:"irritated",index:16,name:"不耐烦"},{id:"love",index:17,name:"喜欢"}];
export const colorOptions = COLORS.map((s, index) => ({
  ...s,
  name: colorNames[index]!,
}));
