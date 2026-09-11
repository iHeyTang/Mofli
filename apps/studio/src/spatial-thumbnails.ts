import {
  scene3DMath as math,
  type Scene3D,
  type Node3D,
} from "@mofli/core/scene3d";
import { createSpatialRenderer } from "@mofli/core/spatial-browser";
import {
  PetEngine,
  composeSpatialAttachments,
  type AttachmentInstance,
  type Rig,
  type Skin,
  type RigConfig,
  type RigPose,
} from "@mofli/core";

type Job = {
  rig: Rig;
  key: string;
  scene: () => ReturnType<PetEngine["sampleScene"]>;
  listeners: Set<(url: string) => void>;
};
const caches = new WeakMap<Rig, Map<string, string>>();
const queue: Job[] = [];
let host: HTMLDivElement | undefined;
let renderer: ReturnType<typeof createSpatialRenderer> | undefined;
let scheduled = false;
let disposeTimer: ReturnType<typeof setTimeout> | undefined;

function surface() {
  if (!host) {
    host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:80px;height:80px;pointer-events:none;background:#f9f9f6";
    document.body.append(host);
    renderer = createSpatialRenderer(host);
  }
  return renderer!;
}
function releaseWhenIdle() {
  clearTimeout(disposeTimer);
  if (renderer)
    disposeTimer = setTimeout(() => {
      renderer?.destroy();
      host?.remove();
      renderer = undefined;
      host = undefined;
    }, 5000);
}
function schedule() {
  if (scheduled || !queue.length) return;
  clearTimeout(disposeTimer);
  scheduled = true;
  // Work after the next paint, one thumbnail per task. Never delay the pet switch on a whole catalog.
  requestAnimationFrame(() => setTimeout(run, 0));
}
function run() {
  scheduled = false;
  const job = queue.shift();
  if (!job) {
    releaseWhenIdle();
    return;
  }
  if (job.listeners.size) {
    try {
      const r = surface();
      r.render(job.scene());
      if (!r.element || r.backend !== "webgl")
        throw new Error("WebGL unavailable for 3D preview");
      const url = r.element.toDataURL("image/png");
      let cache = caches.get(job.rig);
      if (!cache) caches.set(job.rig, (cache = new Map()));
      cache.set(job.key, url);
      if (cache.size > 128) cache.delete(cache.keys().next().value!);
      for (const listener of job.listeners) listener(url);
    } catch (error) {
      for (const listener of job.listeners) listener("");
    }
  }
  if (queue.length) schedule();
  else releaseWhenIdle();
}

/** A single temporary GPU context for all 3D cards, with bounded per-rig bitmap caching. */
export function requestSpatialThumbnail(
  rig: Rig,
  skin: Skin,
  config: RigConfig,
  pose: RigPose,
  time: number,
  listener: (url: string) => void,
  accessory?: string,
  instance?: AttachmentInstance,
) {
  const key = JSON.stringify([skin, config, pose, time, accessory, instance]);
  const cache = caches.get(rig),
    cached = cache?.get(key);
  if (cached) {
    cache!.delete(key);
    cache!.set(key, cached);
    listener(cached);
    return () => {};
  }
  let job = queue.find((j) => j.rig === rig && j.key === key);
  if (!job) {
    job = {
      rig,
      key,
      scene: () => {
        const scene = new PetEngine(rig, skin, {
          rigConfig: config,
          pose,
        }).sampleScene(time, true);
        if (instance)
          return accessoryScene(
            composeSpatialAttachments(scene, [instance], time),
            `attachment-${instance.id}`,
            instance.attachment.previewNodes?.map(
              (id) => `attachment-${instance.id}-${id}`,
            ),
          );
        return accessory ? accessoryScene(scene, accessory) : scene;
      },
      listeners: new Set(),
    };
    queue.push(job);
  }
  job.listeners.add(listener);
  schedule();
  return () => {
    job!.listeners.delete(listener);
    if (!job!.listeners.size) {
      const i = queue.indexOf(job!);
      if (i >= 0) queue.splice(i, 1);
      if (!queue.length) releaseWhenIdle();
    }
  };
}

/** Isolate the actual accessory meshes and frame their bounds, without the pet. */
function accessoryScene(
  scene: Scene3D,
  key: string,
  previewNodes?: readonly string[],
): Scene3D {
  let nodes: Node3D[] = [];
  const find = (items: readonly Node3D[]) => {
    for (const n of items) {
      if (n.id === key || (key === "ears" && n.id.startsWith("ear-")))
        nodes.push(n);
      else find(n.children ?? []);
    }
  };
  find(scene.nodes);
  if (previewNodes?.length) {
    const selected = new Set(previewNodes);
    const trim = (node: Node3D): Node3D[] => {
      if (selected.has(node.id)) return [node];
      const children = (node.children ?? []).flatMap(trim);
      return children.length
        ? [{ ...node, geometry: undefined, material: undefined, children }]
        : [];
    };
    nodes = nodes.flatMap(trim);
  }
  const vertices: number[][] = [];
  function visit(node: Node3D, parent = math.identity()) {
    const m = math.multiply(parent, math.matrix(node.transform));
    for (const p of node.geometry?.vertices ?? [])
      vertices.push(
        [0, 1, 2].map(
          (row) =>
            m[row * 4]! * p[0] +
            m[row * 4 + 1]! * p[1] +
            m[row * 4 + 2]! * p[2] +
            m[row * 4 + 3]!,
        ),
      );
    node.children?.forEach((child) => visit(child, m));
  }
  nodes.forEach((node) => visit(node));
  if (!vertices.length)
    throw new Error("Missing 3D accessory geometry: " + key);
  const low = [0, 1, 2].map((k) => Math.min(...vertices.map((v) => v[k]!)));
  const high = [0, 1, 2].map((k) => Math.max(...vertices.map((v) => v[k]!)));
  return {
    ...scene,
    nodes,
    camera: {
      projection: "orthographic",
      position: [
        (low[0]! + high[0]!) / 2,
        (low[1]! + high[1]!) / 2,
        high[2]! + 5,
      ],
      size: Math.max(high[0]! - low[0]!, high[1]! - low[1]!) * 1.35,
    },
  };
}
