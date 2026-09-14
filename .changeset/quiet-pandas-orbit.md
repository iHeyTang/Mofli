---
"@mofli/grove": minor
---

Add three orbiting decorations for 3D pets, and the orbit bands they need.

`character.orbit` was the only ring mount, so a 3D pet could wear a single
orbiting accessory. The spatial rig now also exposes `character.orbit.high`,
`character.orbit.low` and `character.orbit.trail`, each a vertical offset of the
body centre, and the library adds one ring per band:

- 星珠环 (`spatial-constellation`): evenly spaced gem beads on the top band, with
  one gold anchor bead and a highlight travelling bead to bead.
- 流萤环绕 (`spatial-fireflies`): pulsing fireflies on a lemniscate loop, biased
  toward the camera so the swarm reads in front of the pet.
- 彗尾环绕 (`spatial-comet`): a comet core pulling a cord swept along its own band,
  so the tail follows the ring's curve instead of hanging in a straight line.

All four rings combine. Positions stay an explicit function of time, so paused and
reduced-motion scenes remain static, and the scene keeps its triangle budget.
