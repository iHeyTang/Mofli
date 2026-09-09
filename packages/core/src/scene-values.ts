/** Serializable numeric channels. No source strings, eval, or access to the host. */
export type SceneValue =
  | number
  | { parameter: string }
  | { variable: string }
  | { time: true }
  | {
      op:
        | "add"
        | "sub"
        | "mul"
        | "div"
        | "mod"
        | "sin"
        | "cos"
        | "pow"
        | "min"
        | "max";
      args: readonly SceneValue[];
    };
export interface SceneChannels {
  variables?: Record<string, SceneValue>;
  channels?: readonly {
    path: readonly (string | number)[];
    value: SceneValue;
  }[];
}
export function resolveSceneChannels<T extends SceneChannels>(
  scene: T,
  time: number,
  parameters: Readonly<Record<string, number>>,
): T {
  if (!scene.channels?.length) return scene;
  const memo = new Map<string, number>(),
    active = new Set<string>();
  const evaluate = (v: SceneValue, depth = 0): number => {
    if (depth > 64) throw new Error("Scene expression too deep");
    let result: number;
    if (typeof v === "number") result = v;
    else if ("time" in v) result = time;
    else if ("parameter" in v) result = parameters[v.parameter]!;
    else if ("variable" in v) {
      if (memo.has(v.variable)) return memo.get(v.variable)!;
      if (
        active.has(v.variable) ||
        !Object.hasOwn(scene.variables ?? {}, v.variable)
      )
        throw new Error("Invalid scene variable");
      active.add(v.variable);
      result = evaluate(scene.variables![v.variable]!, depth + 1);
      active.delete(v.variable);
      memo.set(v.variable, result);
    } else {
      const args = v.args.map((a) => evaluate(a, depth + 1)),
        [a, b] = args;
      const arity = v.op === "sin" || v.op === "cos" ? 1 : 2;
      if (
        args.length < arity ||
        (!["add", "mul", "min", "max"].includes(v.op) && args.length !== arity)
      )
        throw new Error("Invalid scene operator arity");
      switch (v.op) {
        case "add":
          result = args.reduce((a, b) => a + b, 0);
          break;
        case "mul":
          result = args.reduce((a, b) => a * b, 1);
          break;
        case "sub":
          result = a! - b!;
          break;
        case "div":
          result = a! / b!;
          break;
        case "mod":
          result = a! % b!;
          break;
        case "sin":
          result = Math.sin(a!);
          break;
        case "cos":
          result = Math.cos(a!);
          break;
        case "pow":
          result = Math.pow(a!, b!);
          break;
        case "min":
          result = Math.min(...args);
          break;
        case "max":
          result = Math.max(...args);
          break;
        default:
          throw new Error("Unknown scene operator");
      }
    }
    if (!Number.isFinite(result)) throw new Error("Nonfinite scene value");
    return result;
  };
  const copy = structuredClone(scene);
  for (const channel of scene.channels) {
    const keys = channel.path;
    if (
      keys[0] !== "nodes" ||
      keys.length < 3 ||
      keys.some((k) =>
        ["__proto__", "constructor", "prototype"].includes(String(k)),
      )
    )
      throw new Error("Invalid scene channel path");
    let target: any = copy;
    for (const key of keys.slice(0, -1)) {
      if (!target || !Object.hasOwn(target, key))
        throw new Error("Unknown scene channel path");
      target = target[key];
    }
    const key = keys[keys.length - 1]!;
    if (
      !target ||
      !Object.hasOwn(target, key) ||
      typeof target[key] !== "number"
    )
      throw new Error("Channels only target numeric properties");
    target[key] = evaluate(channel.value);
  }
  return copy;
}
