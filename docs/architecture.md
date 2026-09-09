# Mofli architecture / v0.1

## Design boundaries

The core is TypeScript without browser globals or framework imports. A rig owns topology, a bounded control space, geometric constraints, skin binding and pose generation. The studio is a disposable client of the SDK. A skin carries a rig identifier, named color slots and bounded numeric parameters. The browser runtime owns rendering and input. The host owns application events, persistence and permission to install executable rigs.

```text
Amiba / another host
  → activity, mood, skin
  → Browser Runtime → PetEngine → installed Rig.sample()
  → neutral Frame → SVG DOM
```

The workspace contains @mofli/core, the optional @mofli/grove collection, and Studio. Official contains all built-in rigs, skins and accessories and depends only on core. Third-party packages may depend on core alone or extend official resources. Logical resource compatibility is independent of npm package boundaries. See [resource packs](./resource-packs.md).

## Rig contract

`id` and `version` identify the rig implementation; v1 skins currently match the rig ID and protocol version. `parameters` defines ranges and defaults; `colors` declares available paint slots. `sample({time,state,skin,reducedMotion,motion,prepared})` must not mutate inputs, use global clocks or random values. Output geometry uses a 320 × 320 coordinate system. `anchors` provides authoring diagnostics; `bounds` is descriptive geometry for future host layout/hit testing, not enforced clipping in v0.1.

Soft body uses 64 polar samples, a quadratic smoothed closed outline and procedural facial features. Mechanical uses independent rectangle, ellipse and line elements with antenna/foot anchors. The separate implementations deliberately share only the protocol.

A frame is not a fixed body-and-eyes record. It contains an ordered flat list of supported primitives. IDs must be unique and stable across samples. A custom renderer can consume these primitives without Vue or React. Browser supports typed mask and linearGradient resources with instance-local IDs and custom Frame.viewBox. It still does not support arbitrary shaders, image textures, external URLs or nested SVG groups.

## Preparation and extensions

RigRegistry explicitly installs trusted rigs and resolves skin rig IDs. Duplicate registrations, invalid ranges and incompatible skins are rejected. `Rig.prepare(skin)` runs before a skin is committed, and a failed preparation leaves the existing skin unchanged. Prepared values are treated as immutable by the rig.

Soft-body preparation bounds the minimum radial extent over all permitted temporal perturbations and conservatively accounts for quadratic smoothing. It measures the complete face envelope, reserves clearance and limits the shared gaze amplitude once per skin. Face features share the body's affine deformation. This avoids per-frame nearest-edge switching; it is specific to this bounded shape family, not an arbitrary contour solver.

## State and animation

PetEngine accepts typed activity, mood, look, drag, press and tap events. It stores a current snapshot and last reaction timestamp. Sampling is deterministic for that snapshot, not event-sourced replay. Browser time stops while hidden or paused. Geometry input is normalized to [-1, 1]; non-finite pointer data is ignored. Automatic movement is suppressed by reduced-motion preference, while direct input still works.

Direct manipulation is owned by the browser: pointer capture prevents a drag getting stuck outside the SVG; release/cancel/lost capture clear pressed state. The drag target eases back with a delta-time exponential response in the render loop; gaze targets use an analytical bounded curve in the core. This is a first interaction model, not a full spring or physics engine. The whole SVG is the current interaction target.

### Transitions and behaviors

Timestamped mutations must be non-negative and monotonic. `sample()` does not advance the mutation clock or discard prior transition data. It remains repeatable for the current snapshot, not a full historic event log. `setSkin(skin, time)` should receive the host time; omitted time uses the last event time.

Discrete changes freeze the currently visible frame and blend toward the newly sampled target. Compatible primitive attributes and path structures interpolate; incompatible primitives crossfade. Colors interpolate in hex RGB. This provides C0 continuity on interruption, not C1 continuity or a generic topology-preserving morph guarantee. The outgoing pose is currently a frozen frame; live dual-pose mixing is future work.

A Behavior is JSON with duration, priority and bounded keyframe tracks matching Rig channels. Tracks use smoothstep segments and must start/end neutral, preventing abrupt one-shot completion. One clip plays at a time: lower priorities are rejected while a higher priority is active, equal/higher priorities interrupt, and pressing cancels playback and blocks new clips. Reduced motion skips clips and frame transitions. `play()` returns acceptance; malformed or unsupported clips throw.

## Resource lifetime

`createSvgRenderer()` is a low-level public API with render/setDebug/destroy and no animation loop. It reuses stable SVG nodes and only updates changed attributes. Each createPet owns one SVG and one requestAnimationFrame loop. destroy aborts listeners, cancels the loop and removes only its SVG. Rig changes recreate the instance; same-rig skins validate before assignment. The host should not modify nodes inside the SVG.

## Trust

Skin files are data; strict whitelists and color/number validation define the accepted surface. The studio caps JSON uploads at 64 KB. SVG attributes are set through DOM APIs and restricted to a small attribute set; URL paint references are rejected. Custom rig code is **trusted executable code**, not safe untrusted plugin content. No sandbox guarantees are claimed.

## Next milestones

1. Rig-owned pose blending, continuous velocities and explicit transition invariants.
2. Deterministic idle gaze and type-safe mask/clip/group resources with instance-local IDs. Sphere/plane helpers and constrained forward-kinematic joint chains are now available; see bindings.md.
3. Multi-track behaviors, semantic capability maps and documented fallback policy.
4. Rig/skin schema migration, geometry validation for more expressive body families.
5. AI authoring using those constraints and visual acceptance sheets.
6. Package release review and Amiba adapter; keep host APIs outside Core.

See [Bloub design study](./bloub-design-study.md) for source-backed reasoning and the current implementation gaps.

## Optional geometry toolkit

`bindPlane` preserves a flat local surface. `bindEllipsoid` projects the point, tangent frame and normal of a sphere/ellipsoid. `solveJointChain` implements fixed-length forward kinematics with local angle bounds. A Rig may combine these tools or use none. Bloub and cat-head use spherical face projection. `Shape.transform` carries an optional typed affine matrix through frame mixing and rendering. Generic matrix interpolation is coefficient-wise and does not claim rotation-aware or length-preserving intermediate poses; use Rig-level kinematics for structural guarantees.

## Bloub reference integration

The user explicitly requested faithful reproduction after rejecting the initial sample pets. An optional `@mofli/grove/rigs/bloub` entry converts attributed MIT upstream calculations into Mofli Frames. The default demo now exercises this rig and the SDK resource renderer; no upstream Vue UI is embedded. The core does not import Bloub. See THIRD_PARTY_NOTICES.md and docs/bloub-reference.md. This supersedes earlier blanket no-source-reuse statements for this explicitly scoped integration.


### Rig-owned skin transitions

`Rig.updateSkin({ skin, previousSkin, prepared, time, skinTime, restart })` optionally returns a fresh prepared state and `transition: "rig" | "frame"`. Rig-owned transitions bypass generic frame blending so geometry, facial bindings and masks are generated from one coherent interpolated pose. Rigs without this hook retain the existing prepare/snapshot fallback. Validate before returning; do not mutate previous prepared state. Bloub uses this hook for all manual state selections, for interrupted morphs and for handoff to automatic playback. Its state clock is preserved across selections; `restart:false` color edits preserve motion (colors apply immediately). Explicit restart/seek in the demo creates a fresh engine.
