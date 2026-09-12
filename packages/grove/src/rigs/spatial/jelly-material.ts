import type { Material3D } from "@mofli/core/scene3d";

/** Match the companion's soft, refractive gel instead of opaque plastic. */
export function jellyMaterial(color: string, transmission = 0.84): Material3D {
  return { color, gloss: 0.52, transmission, transmissionRoughness: 0.7 };
}

import { defineSpatialAttachment } from "@mofli/core";
import type { Node3D } from "@mofli/core/scene3d";

/** Expose one persisted control while keeping thin details readable. */
export function defineJellyAttachment(
  definition: Parameters<typeof defineSpatialAttachment>[0],
) {
  return defineSpatialAttachment({
    ...definition,
    parameters: {
      ...definition.parameters,
      transmission: { min: 0, max: 1, default: 0.84 },
    },
    labels: { ...definition.labels, transmission: "透光程度" },
    sampleScene(context, parameters, colors) {
      const amount = parameters.transmission ?? 0.84;
      const visit = (node: Node3D): Node3D => ({
        ...node,
        ...(node.material?.transmission !== undefined
          ? {
              material: {
                ...node.material,
                transmission: Math.min(
                  1,
                  (node.material.transmission / 0.84) * amount,
                ),
              },
            }
          : {}),
        ...(node.children ? { children: node.children.map(visit) } : {}),
      });
      return definition.sampleScene(context, parameters, colors).map(visit);
    },
  });
}
