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
export const shapeOptions = SHAPES.map((s, index) => ({
  id: s.id,
  index,
  name: shapeNames[index]!,
}));
export const expressionOptions = [...EXPRESSIONS.map((s, index) => ({
  id: s.id,
  index,
  name: expressionNames[index]!,
})), { id: "irritated", index: 16, name: "Irritated > <" }];
export const colorOptions = COLORS.map((s, index) => ({
  ...s,
  name: colorNames[index]!,
}));
