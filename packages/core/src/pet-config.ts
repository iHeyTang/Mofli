import { composeSpatialAttachments } from "./spatial-attachments.js";
import { collectResourcePacks, type ResourcePack } from "./resource-pack.js";
import {
  PetEngine,
  validateSkin,
  type Skin,
  type Rig,
  type RigConfig,
  type RigPose,
} from "./index.js";
import {
  composeAttachments,
  type Attachment,
  type AttachmentInstance,
} from "./attachments.js";
export interface PetConfig {
  version: 1;
  skin: Skin;
  rigConfig: RigConfig;
  pose: RigPose;
  attachments: {
    id: string;
    type: string;
    version: 1;
    parameters?: Record<string, number>;
    colors?: Record<string, string>;
  }[];
}
/** Explicit trusted implementation registry; configuration never imports code. */
export class PetRegistry {
  private rigs = new Map<string, Rig>();
  private parts = new Map<string, Attachment>();
  private skins = new Map<string, Skin>();
  private packIds = new Set<string>();
  registerPacks(...packs: ResourcePack[]) {
    for (const p of packs)
      if (this.packIds.has(p.id)) throw new Error(`Duplicate pack: ${p.id}`);
    const resources = collectResourcePacks([
      {
        id: "__installed",
        version: 1,
        rigs: [...this.rigs.values()],
        skins: [...this.skins.values()],
        attachments: [...this.parts.values()].map((attachment) => ({
          name: attachment.id,
          attachment,
        })),
      },
      ...packs,
    ]);
    this.rigs = new Map(resources.rigs.map((r) => [r.id, r]));
    this.parts = new Map(
      resources.attachments.map((p) => [p.attachment.id, p.attachment]),
    );
    this.skins = new Map(resources.skins.map((s) => [s.id, s]));
    for (const p of packs) this.packIds.add(p.id);
    return this;
  }
  registerRig(rig: Rig) {
    if (this.rigs.has(rig.id)) throw new Error(`Duplicate rig: ${rig.id}`);
    this.rigs.set(rig.id, rig);
    return this;
  }
  registerAttachment(part: Attachment) {
    if (this.parts.has(part.id))
      throw new Error(`Duplicate attachment: ${part.id}`);
    this.parts.set(part.id, part);
    return this;
  }
  resolve(value: unknown): {
    config: PetConfig;
    engine: PetEngine;
    instances: AttachmentInstance[];
  } {
    let v = value as PetConfig;
    if (
      !v ||
      typeof v !== "object" ||
      v.version !== 1 ||
      Object.keys(v).some(
        (k) =>
          !["version", "skin", "rigConfig", "pose", "attachments"].includes(k),
      )
    )
      throw new Error("Invalid pet configuration");
    const rig = this.rigs.get(v.skin?.rig);
    if (!rig) throw new Error(`Rig not installed: ${v.skin?.rig}`);
    if (rig.migrateConfig) v = rig.migrateConfig(structuredClone(v));
    const skin = validateSkin(v.skin, rig);
    for (const field of [v.rigConfig, v.pose])
      if (
        !field ||
        typeof field !== "object" ||
        Array.isArray(field) ||
        Object.values(field).some(
          (n) => typeof n !== "number" || !Number.isFinite(n),
        )
      )
        throw new Error("Invalid pet parameters");
    if (!Array.isArray(v.attachments) || v.attachments.length > 16)
      throw new Error("Invalid attachment list");
    const instances = v.attachments.map((ref) => {
      if (
        !ref ||
        typeof ref !== "object" ||
        ref.version !== 1 ||
        Object.keys(ref).some(
          (k) => !["id", "type", "version", "parameters", "colors"].includes(k),
        )
      )
        throw new Error("Invalid attachment reference");
      const attachment = this.parts.get(ref.type);
      if (!attachment) throw new Error(`Attachment not installed: ${ref.type}`);
      if (attachment.dimension !== "3d" && ref.colors !== undefined)
        throw new Error("2D attachment color overrides are not supported");
      return {
        id: ref.id,
        colors:
          ref.colors === undefined ? undefined : structuredClone(ref.colors),
        attachment,
        parameters:
          ref.parameters === undefined
            ? undefined
            : structuredClone(ref.parameters),
      };
    });
    const engine = new PetEngine(rig, skin, {
      rigConfig: v.rigConfig,
      pose: v.pose,
    });
    if (engine.dimension === "3d") {
      composeSpatialAttachments(engine.sampleScene(0, true), instances);
    } else composeAttachments(engine.sample(0, true), instances); // atomic validation, including compatibility and conflicts
    const config: PetConfig = {
      version: 1,
      skin: engine.getSkin(),
      rigConfig: engine.getRigConfig(),
      pose: engine.getPose(),
      attachments: structuredClone(v.attachments),
    };
    return { config, engine, instances };
  }
  create(value: unknown) {
    const { config, engine, instances } = this.resolve(value);
    return {
      engine,
      sample: (time: number, reducedMotion = false) =>
        composeAttachments(
          engine.sample(time, reducedMotion),
          instances,
          reducedMotion ? 0 : time,
        ),
      sampleScene: (time: number, reducedMotion = false) =>
        composeSpatialAttachments(
          engine.sampleScene(time, reducedMotion),
          instances,
          reducedMotion ? 0 : time,
        ),
      exportConfig: (): PetConfig => ({
        ...structuredClone(config),
        skin: engine.getSkin(),
        rigConfig: engine.getRigConfig(),
        pose: engine.getPose(),
      }),
    };
  }
  export(engine: PetEngine, attachments: PetConfig["attachments"]): PetConfig {
    return this.resolve({
      version: 1,
      skin: engine.getSkin(),
      rigConfig: engine.getRigConfig(),
      pose: engine.getPose(),
      attachments,
    }).config;
  }
}
