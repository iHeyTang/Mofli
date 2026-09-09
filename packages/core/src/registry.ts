import {
  PetEngine,
  validateSkin,
  type Rig,
  type Skin,
  type EngineOptions,
} from "./index.js";
/** Explicit registry of trusted installed code, independent of built-in rigs. */
export class RigRegistry {
  private rigs = new Map<string, Rig>();
  register(rig: Rig): this {
    if (
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(rig.id) ||
      rig.version !== 1 ||
      typeof rig.sample !== "function"
    )
      throw new Error("Invalid rig definition");
    if (this.rigs.has(rig.id))
      throw new Error(`Rig already registered: ${rig.id}`);
    for (const rules of [
      rig.parameters,
      rig.poseParameters ?? {},
      rig.channels ?? {},
    ])
      for (const [key, r] of Object.entries(rules)) {
        if (
          !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(key) ||
          ![r.min, r.max, r.default].every(Number.isFinite) ||
          r.min > r.max ||
          r.default < r.min ||
          r.default > r.max
        )
          throw new Error(`Invalid parameter rule: ${key}`);
      }
    if (Object.values(rig.colors).some((c) => !/^#[\da-f]{6}$/i.test(c)))
      throw new Error("Invalid rig color");
    this.rigs.set(rig.id, {
      ...rig,
      parameters: structuredClone(rig.parameters),
      poseParameters: structuredClone(rig.poseParameters ?? {}),
      colors: structuredClone(rig.colors),
      surfaces: structuredClone(rig.surfaces ?? {}),
      variants: structuredClone(rig.variants ?? {}),
      channels: structuredClone(rig.channels ?? {}),
    });
    return this;
  }
  get(id: string): Rig {
    const rig = this.rigs.get(id);
    if (!rig) throw new Error(`Rig not installed: ${id}`);
    return {
      ...rig,
      parameters: structuredClone(rig.parameters),
      poseParameters: structuredClone(rig.poseParameters ?? {}),
      colors: structuredClone(rig.colors),
      surfaces: structuredClone(rig.surfaces ?? {}),
      variants: structuredClone(rig.variants ?? {}),
      channels: structuredClone(rig.channels ?? {}),
    };
  }
  list(): Rig[] {
    return [...this.rigs.keys()].map((id) => this.get(id));
  }
  resolve(skin: unknown): { rig: Rig; skin: Skin } {
    if (
      !skin ||
      typeof skin !== "object" ||
      !("rig" in skin) ||
      typeof skin.rig !== "string"
    )
      throw new Error("Skin needs a rig id");
    const rig = this.get(skin.rig);
    return { rig, skin: validateSkin(skin, rig) };
  }
  create(skin: unknown, options?: EngineOptions): PetEngine {
    const resolved = this.resolve(skin);
    return new PetEngine(resolved.rig, resolved.skin, options);
  }
}
