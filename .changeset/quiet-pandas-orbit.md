---
"@mofli/core": minor
"@mofli/grove": minor
---

Rework the 3D 角色环绕 ring so it drifts instead of marching in place.

The stardust ring is unchanged. Alongside it the library adds 流光环绕
(`spatial-ribbon`), a ribbon of light on its own band under the ring, so both can
circle the body at once:

- The radius breathes, the altitude rises and dips on two frequencies, and the
  path speed varies along its length, so no two frames repeat.
- It is thickest at the middle and dissolves into haze at both ends, instead of a
  cord with blunt cuts.
- Each stretch fades according to its own distance from the camera, so the far
  side recedes.
- Shed starlight drifts off it as it travels.

Controls are 光带粗细, 环绕范围, 飘动速度, 光带长度, 起伏高度, 首尾消散 and
柔光强度, with 光带 and 星点 colors. The band radius stays inside the preview
frame at every preset.

`Material3D.opacity` is new: a per-node alpha, which is what lets a volume fade
with its own distance or along its own length. `taperedStroke` reads a radius per
path point, so one sweep can thin toward its tip.

The rig exposes `character.orbit.low` next to `character.orbit` for the second
band. Studio labels it 下层环绕.
