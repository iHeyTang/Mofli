import { collectResourcePacks } from "@mofli/core";
import {grovePack} from '@mofli/grove';
export function resourcesFor(project = {}) {
  const packs = project.packs ?? [];
  const rigIds = new Set(packs.flatMap((p) => (p.rigs ?? []).map((r) => r.id))),
    skinIds = new Set(packs.flatMap((p) => (p.skins ?? []).map((s) => s.id))),
    partIds = new Set(
      packs.flatMap((p) => (p.attachments ?? []).map((a) => a.attachment.id)),
    );
  // Installed defaults are fallbacks. An explicit project pack owns its IDs,
  // including implementations loaded through Vite's separate server module graph.
  const base = collectResourcePacks([
    {...grovePack,id:'mofli.defaults',rigs:grovePack.rigs.filter(r=>!rigIds.has(r.id)),skins:grovePack.skins.filter(s=>!skinIds.has(s.id)),attachments:grovePack.attachments.filter(p=>!partIds.has(p.attachment.id))},
    ...packs,
  ]);
  // Existing creator projects can still override a default skin through pets.
  const rigs = new Map(base.rigs.map((r) => [r.id, r])),
    skins = new Map(base.skins.map((s) => [s.id, s]));
  for (const p of project.pets ?? []) {
    rigs.set(p.rig.id, p.rig);
    skins.set(p.skin.id, p.skin);
  }
  return collectResourcePacks([
    {
      id: "studio.resolved",
      version: 1,
      rigs: [...rigs.values()],
      skins: [...skins.values()],
      attachments: [...base.attachments, ...(project.attachments ?? [])],
    },
  ]);
}
