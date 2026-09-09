import type { Rig, Skin, Attachment, ResourcePack } from "@mofli/core";
export interface StudioProject {
  packs?: ResourcePack[];
  pets?: { rig: Rig; skin: Skin }[];
  attachments?: { name: string; attachment: Attachment }[];
  defaultSkin?: string;
  defaultAttachments?: string[];
}
