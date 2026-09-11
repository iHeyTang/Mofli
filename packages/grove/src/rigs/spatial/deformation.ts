import type { Geometry3D, Vector3, Node3D } from "@mofli/core/scene3d";

/** A small height-dependent wobble gives the lower and upper body different responses. */
export function softDeformer(body: Geometry3D, amount: number) {
  const low = Math.min(...body.vertices.map((v) => v[1]));
  const high = Math.max(...body.vertices.map((v) => v[1])),
    height = high - low;
  function field(v: Vector3) {
    const u = Math.max(0, Math.min(1, (v[1] - low) / height)),
      theta = Math.PI * u;
    return {
      f: 1 + amount * (1 - 2 * u),
      s: 1 + (amount * 0.07 * Math.PI * Math.cos(theta)) / height,
      dx:
        ((-2 * amount) / height) * v[0] +
        (amount * 0.16 * Math.PI * Math.cos(theta)) / height,
      dz: ((-2 * amount) / height) * v[2],
      theta,
    };
  }
  function point(v: Vector3): Vector3 {
    const { f, theta } = field(v);
    return [
      v[0] * f + amount * 0.16 * Math.sin(theta),
      v[1] + amount * 0.07 * Math.sin(theta),
      v[2] * f,
    ];
  }
  function mesh(g: Geometry3D): Geometry3D {
    const vertices = g.vertices.map(point);
    const normals = g.normals?.map((n, i) => {
      const { f, s, dx, dz } = field(g.vertices[i]!),
        x = n[0] / f,
        z = n[2] / f,
        y = (n[1] - dx * x - dz * z) / s,
        l = Math.hypot(x, y, z);
      return [x / l, y / l, z / l] as Vector3;
    });
    const surface =
      g.surface?.kind === "ellipsoid" || g.surface?.kind === "rounded"
        ? {
            kind: "rounded" as const,
            radii: [0, 1, 2].map((axis) =>
              Math.max(...vertices.map((v) => Math.abs(v[axis]!))),
            ) as unknown as Vector3,
          }
        : undefined;
    return { ...g, vertices, normals, faces: undefined, surface };
  }
  function attached(node: Node3D): Node3D {
    if (node.id === "body") return node;
    if (node.transform?.position) {
      const { f, s } = field(node.transform.position),
        scale = node.transform.scale ?? [1, 1, 1];
      return {
        ...node,
        transform: {
          ...node.transform,
          position: point(node.transform.position),
          scale: [scale[0] * f, scale[1] * s, scale[2] * f],
        },
      };
    }
    return node.geometry ? { ...node, geometry: mesh(node.geometry) } : node;
  }
  return { mesh, attached };
}
