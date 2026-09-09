import { resourcesFor } from "../resources.js";
import { PetRegistry } from "@mofli/core";
export async function registryFor(project) {
  const r = resourcesFor(project);
  return new PetRegistry().registerPacks({ id: "studio", version: 1, ...r });
}
