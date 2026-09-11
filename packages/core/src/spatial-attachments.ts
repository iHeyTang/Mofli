import type { Attachment, AttachmentInstance } from "./attachments.js";
import type { Scene3D, Node3D } from "./scene3d.js";

/** A 3D accessory owns its geometry, color slots and bounded numeric controls. */
export function defineSpatialAttachment(
  definition: Omit<Attachment, "sample" | "dimension" | "slot"> & {
    sampleScene: NonNullable<Attachment["sampleScene"]>;
  },
): Attachment {
  return {
    ...definition,
    dimension: "3d",
    slot: "",
    sample() {
      throw new Error("3D accessories require scene sampling");
    },
  };
}
export function composeSpatialAttachments(
  scene: Scene3D,
  instances: readonly AttachmentInstance[],
  time = 0,
): Scene3D {
  if (!instances.length) return scene;
  const ids = new Set<string>(),
    occupied = new Set<string>(),
    additions = new Map<string, Node3D[]>();
  const nodes = new Set<string>();
  const collect = (items: readonly Node3D[]) => {
    for (const n of items) {
      nodes.add(n.id);
      collect(n.children ?? []);
    }
  };
  collect(scene.nodes);
  for (const { id, attachment: a, parameters = {}, colors = {} } of instances) {
    if (!/^[\w-]+$/.test(id) || ids.has(id))
      throw new Error("Invalid or duplicate attachment instance");
    ids.add(id);
    const anchor = scene.mounts?.[a.mount];
    if (a.dimension !== "3d" || !a.sampleScene || !anchor || !nodes.has(anchor))
      throw new Error(`Incompatible attachment: ${a.id}`);
    if (occupied.has(a.mount)) throw new Error(`Mount occupied: ${a.mount}`);
    occupied.add(a.mount);
    if (
      !parameters ||
      typeof parameters !== "object" ||
      Array.isArray(parameters) ||
      Object.keys(parameters).some((k) => !Object.hasOwn(a.parameters ?? {}, k))
    )
      throw new Error("Unknown attachment parameter");
    const resolved: Record<string, number> = {};
    for (const [key, rule] of Object.entries(a.parameters ?? {})) {
      const value = parameters[key] ?? rule.default;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < rule.min ||
        value > rule.max
      )
        throw new Error(`Invalid attachment parameter: ${key}`);
      resolved[key] = value;
    }
    if (
      !colors ||
      typeof colors !== "object" ||
      Array.isArray(colors) ||
      Object.keys(colors).some((k) => !Object.hasOwn(a.colors ?? {}, k))
    )
      throw new Error("Unknown attachment color");
    const palette: Record<string, string> = {};
    for (const [key, defaultColor] of Object.entries(a.colors ?? {})) {
      const value = colors[key] ?? defaultColor;
      if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value))
        throw new Error(`Invalid attachment color: ${key}`);
      palette[key] = value;
    }
    const prefix = (node: Node3D): Node3D => ({
      ...node,
      id: `attachment-${id}-${node.id}`,
      children: node.children?.map(prefix),
    });
    additions.set(anchor, [
      {
        id: `attachment-${id}`,
        children: a.sampleScene({ time }, resolved, palette).map(prefix),
      },
    ]);
  }
  const visit = (node: Node3D): Node3D => ({
    ...node,
    children: [
      ...(node.children ?? []).map(visit),
      ...(additions.get(node.id) ?? []),
    ],
  });
  return { ...scene, nodes: scene.nodes.map(visit) };
}
