# Jungle reveal — homepage design

Date: 2026-10-22
Status: approved by owner (2026-10-22)
Reference implementation: `docs/superpowers/specs/jungle-reveal-reference.html` (the approved mockup, v19)

## What this is

The homepage of tomanistor.com is the TN logo centered on a white page. This adds a
jungle of layered tropical leaves around and over the logo. On load, the logo is mostly
hidden behind dense foliage; as the visitor scrolls, the leaves part and a camera pushes
gently forward until the full logo sits in a white clearing, framed by leaves on every
edge. The goal is a natural, three-dimensional, quietly alive scene that feels like
looking into real foliage, not leaves floating on a page.

The behavior was tuned over 19 mockup iterations with the site owner. The reference
implementation is the source of truth for every number not stated here (counts, ranges,
spring constants, easing curves, blur amounts). Port its behavior; do not re-tune it.

## Goals

- Recreate the approved mockup on the real homepage (`src/src/routes/+page.svelte`) with
  no visible difference in look or motion.
- 60fps on a mid-range laptop and a modern phone, including retina screens.
- Small download (target ≤ 2.5MB total for leaf images) and bounded graphics memory
  (target ≤ 160MB on a 2x screen, ≤ 50MB on a phone).
- Works as part of the existing static build (`adapter-static`, prerendered).

## Non-goals

- Content below the reveal. When the scroll reaches 100% the scene simply rests; what
  comes after (about section, links, etc.) is a separate future project.
- The phone-specific shape of the clearing (see Known issues). Ship the desktop shape on
  phones for now.
- Rendering in WebGL. The DOM/canvas approach in the reference meets the performance
  targets; a rewrite is out of scope.
- Chunked, non-blocking leaf preparation ("item 6" in the perf discussion). The loader
  covers the wait instead.

## Anti-goals (would be a failure even if it "works")

- Visible leaf stems that end in mid-air. Plants with a visible stem must only ever be
  rooted off-screen; leaves set inside the scene must be stemless.
- White page showing at the screen edges at any scroll position. White belongs only in
  the clearing around the logo.
- Leaves that look like they slide across the screen. Leaves part by swinging aside on
  their stem and easing back a short distance toward their edge (travel capped).
- Bouncy or jittery motion: no spring overshoot, no choppy steps when scrolling with a
  mouse wheel, no hitch at the loader hand-off.
- Size relationships that break perspective: a nearer (sharper) leaf must never be
  smaller than a farther (blurrier) one of the same plant.
- Distracting idle motion: no synchronized looping sway or rolling breeze.

## The experience, as approved

### Scene and camera

- The logo is centered, at its current size (`min(50vw, 57vh)` wide).
- Every element sits at a distance from a virtual camera. The camera starts pulled back
  and dollies in as the visitor scrolls, so near layers grow a lot, far layers barely, and
  the logo least. This difference is the main source of depth.
- At 0% scroll, about 80% of the logo is covered (measured: 18.7% visible at 1440×900).
  At 100%, the logo is fully clear with a frame of leaves on all sides.
- The scroll distance is three viewport heights (`300vh`), with the scene `position:
  sticky` for its duration.

### Layers, back to front

1. **Deep layer**: a dim, blurred mass of stemless leaves spread across the leafy area,
   furthest back. Painted once into a canvas.
2. **Backing layer**: dense, far-back leaves rooted at the edges that barely move; their
   job is keeping the screen edges covered at every scroll position. Painted once.
3. **Shade**: a soft dark-green radial gradient behind the live leaves, clear around the
   logo, so gaps between leaves read as shadowy depth rather than white page. Light (the
   owner rejected a stronger version).
4. **Frame leaves**: rooted just off-screen around the whole perimeter, stratified so no
   stretch of edge is bare.
5. **Core and cover leaves**: stemless leaves set inside the scene that cover the logo at
   the start. Core leaves lean aside; cover leaves swing aside on their stem through a
   large angle. If a leaf would need to slide more than ~8% of the screen to clear the
   logo, it is rooted further out instead.
6. **Foreground**: a few very large, heavily blurred leaves right by the lens that sweep
   out of frame fastest as the camera pushes through them.

### Plants and sizing

- Nine plant images plus one sheet of nine monstera leaves (see Assets). Each plant has a
  natural size relative to a monstera, so species keep believable proportions; perspective
  then scales by distance. Every plant appears regularly (weights in the reference).
- The original sheet leaves are low-resolution, so they are only used in far layers.

### Depth cues

- Depth of field: far layers soft, middle layers sharp, foreground strongly blurred.
- Focus pull: the far layers sharpen as the camera moves in (cross-fade between a soft and
  a sharp pre-blurred copy; never re-blur per frame).
- Cursor parallax (mouse only): layers slide against the pointer, steeply scaled by
  distance — foreground most, backdrop and logo barely.
- Depth-based shading and drop shadows baked into each leaf.

### Motion

- Leaves follow scroll through critically damped springs (no overshoot), each with its own
  stiffness, so they lag and settle at slightly different times. Front leaves part first.
- A faint flutter/tilt proportional to each leaf's speed while it moves.
- Idle: leaves are almost still. Each leaf independently stirs for ~2s every 12–35s, at a
  very small angle, so only a few move at once.
- Cursor brush (mouse only): when the pointer moves outward from the logo's center, leaves
  whose blade it passes tip away from it (≤ ~5°, a brisk sweep gives ~2.6°) and ease back
  slightly toward their edge, then settle over about a second. Moving inward does nothing.

### Loader

- A white page. The logo, exactly where and how large the scene's logo starts, is revealed
  in dark grey through a growing window: it opens as a line through the logo's center,
  grows up and down into a center column (20% of the logo's width), then spreads left and
  right. Nothing outside the window is drawn (no pale outline).
- One continuous compositor animation (two phases, ~1s and ~0.9s). The scene fades in
  (0.9s) only after the fill has finished *and* every leaf image is decoded and the first
  frame drawn, so nothing moves at the hand-off. If loading is slower, the full logo rests.

### Accessibility and devices

- `prefers-reduced-motion`: the scroll reveal still works; idle stirring, flutter, tilt,
  parallax and brushing are off.
- Touch: pointer effects only respond to `pointerType === 'mouse'`, so dragging to scroll
  doesn't brush leaves.
- Small screens get proportionally fewer leaves (scaled by viewport area, floor 45%).
- The leaves are decorative: `alt=""`, `aria-hidden` on the scene, the logo keeps its
  existing alt text, and the scroll hint is not essential.

## How it gets made

### Decided

- **Lives in the existing SvelteKit app** in `src/` (Svelte 5, Tailwind 4, adapter-static,
  pnpm). The homepage renders the scene; the static build must still prerender.
- **Styling with Tailwind utilities, not custom CSS classes** (owner's requirement). The
  reference's `<style>` block must be translated to utility classes in the markup. Values
  that change every frame (transforms, opacity, sizes computed at runtime) are set
  directly on elements from script, as in the reference; that is not styling.
- **Page heading**: a visually hidden `<h1>` reading "Toma Nistor – San Diego Software
  Engineer" (Tailwind `sr-only`). It fixes an accessibility gap on a page whose only
  content is a decorative logo, and it is what the existing unit and e2e tests already
  assert, so those tests stay as they are.
- **No image credits on the site** (owner's decision).
- **Rendering approach, as in the reference**:
  - Each live leaf is an `<img>` whose source is a shared, pre-baked bitmap (blob URL).
    Leaves that look alike (same plant, depth band and focus) share one bitmap; bitmaps
    are baked at the largest size any sharer needs.
  - Out-of-focus bitmaps are baked at low resolution (foreground 0.5x, far 1x, sharp
    middle up to 1.5x device pixels).
  - The deep and backing layers are each painted once into two canvases (sharp and soft)
    at 1.5x viewport size and cross-faded with opacity during scroll.
  - Per frame, only `transform`/`opacity` are written, and only when the value changed.
- **Loader built from transforms only** (nested clipping boxes with counter-moving
  children), never `clip-path` or masks, so it stays smooth while the main thread bakes.
- **Assets are WebP**: plants at 1600px on the long side, the leaf sheet at full
  2000×2000; total ~2.0MB. Leaf coordinates (crop box, stem base, tip, stem end) are kept
  in each original image's pixel space and scaled by the shipped image's width.
- **Deterministic layout**: a seeded PRNG (`mulberry32(11)` in the reference) so the
  arrangement is identical on every load. Adding or removing a group reshuffles all
  leaves; the owner approved the v15+ arrangement, so keep group order and counts.
- **Resize** *(Claude's call, from the builder review)*: re-layout and re-bake on resize,
  debounced (150ms), but ignore height-only changes on touch devices, where the address
  bar showing or hiding during a scroll would otherwise trigger a full re-bake mid-scroll.
  Size the scene from the large viewport (`lvh`) so CSS and JS agree on phones. All random
  values for a leaf are drawn once when the leaves are generated, never during layout, so a
  re-layout never reshuffles the arrangement (the reference draws some during layout; fix
  that in the port).

### Left to the builder

- How to split the code into Svelte components and plain TypeScript modules, and where
  the leaf metadata lives.
- Whether images go in `src/src/lib/assets/` (Vite-hashed) or `static/`.
- How the scene starts on the client (e.g. `onMount`), given prerendering: the server
  render should output the white page, the loader and the logo, nothing that needs
  `window`.
- Test approach (see Verification), beyond keeping the existing heading tests passing.
- What shows without JavaScript or if an image fails to load, how the loader starts before
  hydration, and dropping the mockup's debug panel and scroll hint styling details.

## Assets

Source files are on the owner's machine (`~/Downloads/`); the mockup folder holds the
converted WebPs used by the reference:

| Plant | Source file | Has visible stem |
|---|---|---|
| Lady palm | `vecteezy_elegant-lady-palm-leaf-on-transparent-background-for_66748005.png` | yes |
| Fan palm | `vecteezy_a-large-palm-leaf-with-green-leaves_59045445.png` | yes |
| Leafy bush | `vecteezy_tropical-leaves-foliage-plant-bush-floral-isolated-on-white_73621819.png` | no |
| Fern | `vecteezy_fern-leaf-on-black-background_60237062.png` | yes |
| Dark monstera | `vecteezy_green-leaf-isolated-on-transparent-background-for-design_18746927.png` | no |
| Monstera with stem | `vecteezy_monstera-deliciosa-leaf-generated_24728591.png` | yes |
| Ribbed (calathea-style) | `vecteezy_a-vibrant-tropical-leaf-showcasing-rich-green-hues-isolated_57176124.png` | yes |
| Banana | `vecteezy_exotic-banana-leaf-with-transparency_44764247.png` | yes |
| Monstera sheet (9 leaves) | `collection-nine-lush-monstera-leaves.png` | 5 of 9 |

Excluded: `vecteezy_ai-generated-green-palm-tree-png_35594524.png` (poor cut-out).

## Verification

The build is done when, on the production build (`pnpm build && pnpm preview`):

- Visual parity with the reference at 0%, 50% and 100% scroll at 1440×900, and on a
  390×844 phone viewport.
- Outer 15% of the screen has no white (≤ 0.05% of pixels) at 0/25/50/75/100% scroll.
- At 0% scroll about 80% of the logo is hidden (15–25% visible); at 100% none is hidden.
- 60fps median, worst frame ≤ 20ms, during a burst of wheel scrolling with 4x CPU
  throttling at 2x device pixel ratio.
- Baked bitmap plus layer canvas memory ≤ 160MB at 2x, ≤ 50MB on the phone viewport.
- Loader: nothing outside the reveal window is drawn at any phase; the logo's position is
  identical in the loader and the scene at hand-off; the scene appears all at once.
- Reduced motion: no leaf moves while idle.
- `pnpm check`, `pnpm lint`, and the unit/e2e tests pass.

The reference used Playwright scripts for these measurements (pixel counts on
screenshots, frame timing via `requestAnimationFrame`, CDP CPU throttling); reuse that
approach.

## Known issues to carry forward

- **Phone clearing**: on tall, narrow screens the shade's oval shows as grey bands above
  and below the logo at 100% scroll, because there are no leaves there. Not fixed in v1.
- **Load time on slow devices**: ~3–4.6s with a 4x throttled CPU at 2x DPR, covered by the
  loader. Chunked baking would reduce it.
- **Unmeasured compositor memory** for the live `<img>` layers; expected small since the
  bitmaps are shared, but not verified on real hardware.
- **Real-device testing**: all numbers so far come from a headless Chromium with emulated
  screens and CPU. Test on a real iPhone (Safari) and a real laptop before calling it done.
