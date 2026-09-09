# Bloub reference integration

The homepage offers Bloub and cat-head with three compatible skins. The old soft-body and mechanical experiments, their skins and experimental workbench have been removed.

## Provenance and scope

Upstream: https://github.com/jeremy-prt/bloub, commit `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749`, MIT, Jérémy Perret. `packages/grove/src/rigs/bloub/vendor` retains the character-specific engine, shapes, measured profiles, face logic, states and decoration calculations. Adaptation: .js import extensions, attribution headers, and a `fork()` method that copies dated engine state with a separate scratch buffer. Full license is in THIRD_PARTY_NOTICES.md and included in package files.

This is a source-based reference port, not an independently recreated animation algorithm and not an iframe/Vue embed. The user explicitly requested faithful reproduction after the independent sample pets failed the visual goal. Mofli Core, public Rig interface, Frame conversion, SVG resource handling and playback UI remain Mofli code. The reference is not Mofli's original mascot or an assertion of ownership over the imitated avatar design.

## Architecture

`@mofli/grove/rigs/bloub` → upstream character calculation → `bloubFrame()` → Mofli `Frame` → `createSvgRenderer()`.

- 14 state IDs, original duration/geometry/eye matrices and decorative color calculations.
- `parameters.state=-1`: full repeating sequence; integers 0–13: isolated state.
- Engine supplies `skinTime`; selecting a skin restarts local time by default.
- Sequence evaluation reconstructs only the preceding/current state context at the correct absolute local clock. Sampling out of order produces the same frame; it does not depend on prior sample calls.
- Per-state selection uses `Rig.updateSkin` to fork the current dated pose controller and call upstream `setState`. Manual and automatic transitions now both use upstream silhouette/eye pose interpolation, including interrupted morphs; no outer frame crossfade is applied. Switching to full sequence preserves the departing pose. Recoloring with `restart:false` retains the controller and clock.
- Resource masks reproduce holes for the eyes and the notification notch. A paper-colored body backing prevents rear rings leaking through the eyes.
- Linear gradients and ordered front/back arc paths preserve orbit occlusion.
- No pointer-follow or custom expression UI is claimed in this reference page. It focuses on original state playback, seek and inspection.

## Renderer additions

`Frame.resources` supports typed masks and linear gradients; `Frame.viewBox` supports original -158..158 coordinates. Shapes refer to logical resources through `mask` and `paint`. All resource DOM IDs are per-instance, so the large avatar and 14 thumbnail instances cannot collide. Nested references inside mask geometry and arbitrary url() attributes are rejected.

Resources currently rebuild their small defs subtree per frame. Main primitive nodes remain reused. Full hierarchical groups and generic scene/resource topology transitions are not implemented; manual Bloub state transitions interpolate rig poses before generating masks and gradients.

## Validation

- Every isolated state is sampled at roughly 30 fps and compared to upstream-generated geometry.
- Two complete automatic cycles are compared at 62.5 samples/second. Floating event-time roundoff is tolerated at 1e-8 for numeric fields; serialized paths allow at most one upstream 0.01-coordinate rounding quantum.
- Browser raster comparison uses test-only markup equivalent to upstream BloubBot.vue, bypassing Mofli conversion and rendering. Tests compare all 14 poster frames and 14 early transient frames. Per image, channel samples differing by >8 must remain under 0.3%, and mean channel error under 0.4/255. This validates conversion/rendering, not independence from the reused animation source.
- All 196 manual state pairs and rapid interruptions are compared with the upstream controller. Automatic/manual handoff and recoloring during a morph retain the pose clock. Browser click tests compare intermediate body/eye paths with upstream output.
- UI tests cover all 14 previews, playback pause, seek, SVG export and phone-width overflow.

This does not replicate upstream's full customizer, animation editor or GIF/MP4 exporter. Current exported format is the displayed SVG frame.


Mofli precision correction: the alert tear path retains six decimal places in normalized coordinates before its 100× SVG transform. Upstream rounded it to two decimals, magnifying quantization into visible jagged edges. Geometry and motion are otherwise unchanged. Reference comparisons use this locally corrected vendor source; the dedicated precision regression compares against unrounded geometric coordinates.
