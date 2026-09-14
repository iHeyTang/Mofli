---
"@mofli/core": minor
"@mofli/grove": minor
---

Redesign the 3D 角色环绕 accessory as a flowing ribbon of light.

The ring no longer marches around the body at a fixed radius and altitude. It now
breathes: the radius swells, the altitude rises and dips on two different
frequencies, and the path speed varies along its length, so no two frames repeat.
The band is thickest in the middle and dissolves into haze at both ends, and each
stretch fades according to its own distance from the camera. Shed starlight drifts
off it as it travels. Controls are 光带粗细, 环绕范围, 飘动速度, 光带长度, 起伏高度,
首尾消散 and 柔光强度, with 光带 and 星点 colors.

`Material3D.opacity` is new: a per-node alpha, which is what lets a volume fade
with its own distance or along its own length.

Existing `spatial-orbit` configurations keep working. `speed` and `glow` keep
their meaning; the old `density` and `trail` parameters and the `body` and `dust`
colors no longer apply to this accessory.

The three ring mounts added earlier in this branch (`character.orbit.high`, `.low`,
`.trail`) are gone: a mount carries one accessory, so the library shows a single
角色环绕 group, as before.
