# Skin authoring

Use the installed rig factory. Skin contains version, id, name, rig, colors and optional rigConfig. Geometry defaults must obey the rig parameters; runtime state/expression belong in pose and are rejected in skin configuration.

AI prompt: Return skin JSON using declared color slots and geometry ranges. Do not include state, expression, executable code, SVG strings or external resources. Cat head additionally supports markings and eye variants; see surface-skins.md. General textures remain unsupported.

validateSkin validates defaults; instantiate and sample the rig to check geometry. Preview across sizes and states. exportSkin saves current appearance plus adjusted geometry without runtime pose. See [contract](character-layers.md).
