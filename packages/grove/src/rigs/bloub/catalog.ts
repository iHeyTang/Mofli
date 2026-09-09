import { SHAPES, COLORS } from "./vendor/skins.js";
import { EXPRESSIONS } from "./vendor/expressions.js";
const shapeNames = [
  "Circle",
  "Pebble",
  "Rounded Square",
  "Capsule",
  "Triangle",
  "Hexagon",
  "Cloud",
  "Teardrop",
];
const expressionNames = [
  "Neutral",
  "Focused",
  "Surprised",
  "Excited",
  "Happy",
  "Laughing",
  "Angry",
  "Sad",
  "Scared",
  "Skeptical",
  "Confused",
  "Curious",
  "Smug",
  "Shy",
  "Bored",
  "Sleepy",
];
const colorNames = [
  "Ink",
  "Brown",
  "Red",
  "Orange",
  "Amber",
  "Green",
  "Teal",
  "Blue",
  "Purple",
  "Pink",
  "Gray",
  "Cream",
];
export const shapeOptions: { id: string; index: number; name: string }[] = [
  ...SHAPES.map((s, index) => ({
    id: s.id,
    index,
    name: shapeNames[index]!,
  })),
  ...[
    { id: "mofli-dough", index: 8, name: "Mallow Base" },
    { id: "mofli-bean", index: 9, name: "Pip Base" },
    { id: "mofli-stone", index: 10, name: "Pebble Base" },
  ],
];
export const expressionOptions = [...EXPRESSIONS.map((s, index) => ({
  id: s.id,
  index,
  name: expressionNames[index]!,
})), {id:"irritated",index:16,name:"Irritated"},{id:"love",index:17,name:"Love"}];
export const colorOptions = COLORS.map((s, index) => ({
  ...s,
  name: colorNames[index]!,
}));
