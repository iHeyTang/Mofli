# Mofli project constraints

- Core infrastructure remains independently implemented; core/radial.ts, spherical-face.ts and face-math.ts are attributed extractions from Bloub, with its MIT notice distributed in the core package. The user subsequently explicitly requested faithful Bloub reproduction: packages/grove/src/rigs/bloub/vendor, the user-requested cat port in packages/grove/src/rigs/cat-head/vendor, and the optional bloub-reference Rig are the attributed MIT reference integration. Preserve THIRD_PARTY_NOTICES.md and do not describe those files as original Mofli code.
- Keep `packages/core/src/index.ts` and rigs framework- and DOM-independent. Browser integration belongs in `packages/core/src/browser.ts`; Amiba APIs belong in a future adapter.
- Rig is executable trusted code; Skin is validated data. Do not claim untrusted plugin isolation until an actual sandbox exists.
- Keep package private until the owner chooses licensing, verifies package ownership and requests publication.
- v0.1 is a prototype. Preserve honest boundaries in README when changing features.
- Validate meaningful changes with `npm test`, `npm run typecheck`, `npm run build:demo`; browser interaction changes also need Playwright and desktop/mobile visual inspection. On machines with Chrome, use `MOFLI_BROWSER_CHANNEL=chrome npm run test:browser`.
- Main UI: a quiet creature workshop, paper/canvas/fern palette, pet and optional rig anchors at center, library left and skin inspector right. Responsive stacking on mobile. Every visible control should do something.

- Engine-first: the studio must be a removable public-SDK client. Rig means topology + bounded control space + binding constraints + temporal invariants, not just a draw function. Read docs/bloub-design-study.md before expanding rig/animation behavior.

- Logical skin bindings reference exactly one rig. npm resource packs may contain multiple rigs, skins and accessories; package boundaries do not determine compatibility. Core must not import resources or Studio. Use public package imports across boundaries, never sibling source paths. Each package must build independently with installed declared dependencies.
