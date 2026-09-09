import { validateSkin, type Rig, type Skin } from "./index.js";
import type { Attachment } from "./attachments.js";
export interface ResourcePack {
  id: string;
  version: 1;
  rigs?: readonly Rig[];
  skins?: readonly Skin[];
  attachments?: readonly { name: string; attachment: Attachment }[];
}
export function defineResourcePack<const T extends ResourcePack>(pack: T): T {
  if (!pack.id || pack.version !== 1) throw new Error("Invalid resource pack");
  return pack;
}
/** Resolve all packages together: npm package boundaries do not determine compatibility. */
export function collectResourcePacks(packs: readonly ResourcePack[]) {
  const rigs = new Map<string, Rig>(),
    skins = new Map<string, Skin>(),
    attachments = new Map<string, { name: string; attachment: Attachment }>(),
    ids = new Set<string>();
  const add = <T>(map: Map<string, T>, id: string, item: T) => {
    if (map.has(id) && map.get(id) !== item)
      throw new Error(`Conflicting resource: ${id}`);
    map.set(id, item);
  };
  for (const pack of packs) {
    defineResourcePack(pack);
    if (ids.has(pack.id)) throw new Error(`Duplicate pack: ${pack.id}`);
    ids.add(pack.id);
    for (const rig of pack.rigs ?? []) add(rigs, rig.id, rig);
    for (const skin of pack.skins ?? []) add(skins, skin.id, skin);
    for (const part of pack.attachments ?? []) {
      const old = attachments.get(part.attachment.id);
      if (old && old.attachment !== part.attachment)
        throw new Error(`Conflicting resource: ${part.attachment.id}`);
      attachments.set(part.attachment.id, part);
    }
  }
  for (const skin of skins.values()) {
    const rig = rigs.get(skin.rig);
    if (!rig)
      throw new Error(`Rig not installed for skin ${skin.id}: ${skin.rig}`);
    validateSkin(skin, rig);
  }
  return {
    rigs: [...rigs.values()],
    skins: [...skins.values()],
    attachments: [...attachments.values()],
  };
}
