# Jungle reveal — PixiJS renderer

Date: 2026-10-30
Status: approved by owner (2026-10-30)
Amends: `2026-10-22-jungle-reveal-design.md` (the "Rendering approach" section and the WebGL
non-goal). Everything else in that spec still stands.

## Why

On large Retina screens the homepage breaks. As the visitor scrolls, the logo vanishes, and after
switching tabs and coming back, different leaves are showing, so the leaves seem to jump to new places.

Root cause (verified 2026-10-30 in real Chrome on macOS, 2560×1340 at 2x): the scene is ~166
separately composited `<img>` layers plus four 1.5×-viewport canvases. That exceeds Chrome's GPU
memory budget, so Chrome silently stops drawing some layers (the logo among them). Switching tabs
frees the memory and a different subset fits on return. Leaf positions never change. Evidence:

- Raising Chrome's GPU budget (`--force-gpu-mem-available-mb=16384`) makes the bug disappear.
- Shrinking every leaf bitmap to 60% makes it disappear.
- Even at 1440×900 with a 384MB budget, leaves get cut off along tile edges.
- No `resize` event and no rebuild happen on a tab switch. The earlier fixes for resizes and
  background tabs (7875b04, reverted) addressed the wrong cause.

A throwaway spike (`src/src/routes/spike/`) drew the same scene with PixiJS 8 into one WebGL canvas.
At 2560×1340@2x the logo and all leaves stayed visible at every scroll position, across a tab switch,
and under a 384MB GPU budget. It held 60fps and loaded in 1.1s (the current page takes 6.7s). Its
weaknesses were ~535MB of textures at 2560×1340 (~870MB at 3440×1440) and some 30fps frames at
3440×1440@2x.

## Goal

Rebuild how the jungle is drawn, using PixiJS, so the scene renders completely and identically on
any screen and survives tab switches, while keeping the look and motion the owner approved.

## Goals

- One PixiJS (v8) WebGL canvas draws the shade, the logo, the far layers and every live leaf.
- The logo and every leaf are drawn at every scroll position on every screen size. Nothing
  disappears or changes after a tab switch, minimize or sleep.
- Same arrangement, motion and feel as today: layout, camera dolly, springs, parting, idle stir,
  flutter, parallax, cursor brush, focus pull, depth of field, shading, shadows, vignette, loader.
  Small visual differences are acceptable when they buy performance (owner: "the look is open to
  change"), but this is not a redesign.
- Lower memory, using the three changes the owner chose:
  1. Bake leaf images at lower resolution, especially the blurred ones (foreground, far, and
     soft mid leaves).
  2. Replace the four full-screen far-layer canvases (deep/backing × sharp/soft) with ordinary
     sprites, blurred to give the same depth of field and focus pull.
  3. Render at somewhat under full device resolution on very large screens.
- Faster start: drop the WebP encode/decode round trip (`toObjectUrls`). Textures come straight
  from the baked canvases.

## Targets *(Claude's call; adjust if the owner wants different numbers)*

Measured on the production build in real Chrome with the machine's GPU (the existing
`jungle-performance` setup: `--use-angle=metal`, deviceScaleFactor 2):

| Screen @2x | GPU memory (textures + drawing buffer) | Frame time while scrolling |
|---|---|---|
| 1440×900 | ≤ 160MB (the original spec's target) | median ≤ 17.5ms, worst ≤ 20ms at 4x CPU throttle |
| 2560×1340 | ≤ 250MB | median ≤ 17.5ms, p95 ≤ 20ms |
| 3440×1440 | ≤ 300MB | median ≤ 17.5ms, p95 ≤ 20ms |
| 390×844 phone | ≤ 50MB (original target) | — |

"GPU memory" is the scene's own accounting (sum of texture sizes plus the canvas drawing buffer),
exposed on the stage as `data-gpu-mb`, as `data-bitmap-mb` is today.

## Non-goals

- Changing the layout, leaf counts, seed or arrangement. `generateLeaves`, `layoutLeaves` and the
  motion maths stay the source of truth.
- Real 3D (three.js) or custom shaders beyond what PixiJS's built-in filters need.
- Content below the reveal, the phone clearing shape, and chunked baking (still out of scope, as
  in the original spec).

## Anti-goals

Everything in the original spec, plus:

- The logo or any leaf missing, or a different set of leaves showing, after a tab switch,
  minimize or wake from sleep.
- A blank or white canvas when the browser drops the WebGL context. The scene must come back on
  its own, with the same arrangement and no reload.
- Re-blurring full-screen layers every frame. Focus pull must stay a cheap cross-fade or an
  equivalently cheap technique.
- Loading PixiJS during prerender. It touches `navigator` at import, so it must be imported
  dynamically on the client (the spike hit this).

## How it gets made

### Decided

- **PixiJS 8** (`pixi.js`, 8.22.0 installed by the spike, the newest version allowed by the
  package-age check) is a runtime dependency, imported dynamically inside the scene's start-up.
- **Single canvas.** The stage holds one PixiJS canvas (`aria-hidden`) plus the existing DOM
  vignette `<div>` above it. One extra composited layer is fine.
- **Fallback logo** (owner's decision). The stage keeps a plain DOM logo `<img>` (same alt text,
  size and centred position as the scene's starting logo), hidden while the canvas is drawing.
  It shows whenever the scene can't draw: no WebGL, PixiJS failing to start, preparation failing,
  or a lost context the browser won't restore. In every one of those cases `ready` still
  resolves, so the loader fades out onto the fallback logo instead of a blank page. A test forces
  each failure path it can (start-up error, unrestored context loss) and asserts the fallback
  logo is visible.
- **Draw order, back to front:** shade, logo, deep layer, backing layer, live leaves in their
  current order (sorted far to near). It matches today's z-order.
- **Reuse:** `leaves.ts`, `layout.ts`, `camera.ts`, `random.ts`, `sprites.ts` and the motion maths
  in `motion.ts` are kept. `stepLeaf` currently returns a CSS transform string. It becomes a
  function returning numbers (position, rotation, scale, tilt) that the PixiJS sprite reads, with
  the same maths.
- **Logo** is drawn into the canvas, rasterised from the SVG at its largest on-screen size × the
  render resolution. Its accessible name stays on the page through the existing visually hidden
  `<h1>`. The `<noscript>` logo stays.
- **Far layers as sprites.** The deep and backing leaves become individual sprites (or a few
  batched containers) that use the same shared textures. Their soft/sharp focus pull reproduces
  today's look. One acceptable way: render each far layer once into a reduced-resolution
  `RenderTexture` (sharp and soft) on build/resize and cross-fade the two, as today but GPU-side
  and smaller.
- **Resolution cap.** Render at `min(devicePixelRatio, cap)`, where the cap drops on very large
  screens so the drawing buffer stays within the memory targets. The exact cap is tuned to meet
  the targets.
- **Context loss** *(Claude's call)*. Handle WebGL context loss and restore. Keep only the
  decoded source images and re-run the bake on restore; release baked canvases after upload, as
  `releaseBitmaps` does today, so they never compete for the GPU budget or go uncounted. Context
  loss is rare (GPU reset, driver update), so a blank gap of a few seconds during the re-bake is
  acceptable. Restore with the same layout and the current camera and scroll state, with no
  reload or loader. The test checks that the same arrangement eventually draws again, not how
  fast.
- **Tab switches do nothing.** No relayout or rebake on `visibilitychange`, and the resize rules
  stay as they are: debounced 150ms, ignore unchanged sizes, ignore height-only changes on touch.
- **Resize** relayouts, rebakes and resizes the renderer, then swaps textures and positions in
  the same frame, so leaves never draw new positions with old textures. That is today's invariant.
- **Frame loop:** one `requestAnimationFrame` loop that updates sprite properties and calls
  `renderer.render` (PixiJS's own ticker off), as in the spike.
- **Loader hand-off unchanged:** `ready` resolves after the first frame is rendered, and still
  resolves if preparation fails.
- **Styling:** Tailwind utilities only, per the owner's rule.
- **Spike removal:** the `/spike` route is deleted once the real scene replaces it.

### Tests to update or add

The current unit and e2e tests inspect DOM leaves (`img[data-key]`, `style.transform`, z-index,
`will-change`). They are rewritten against the new structure: data attributes on the stage (leaf
count, GPU MB) and screenshots. New tests:

- At 2560×1340@2x with the machine's GPU, the logo is visible at 80% and 100% scroll.
- After forcing a WebGL context loss and restore (`WEBGL_lose_context`), the scene draws again
  and the leaf arrangement is unchanged.
- The memory and frame targets above.
- The existing guarantees still pass: edge coverage at every scroll position (all four sizes),
  ~80% of the logo hidden at the start and none at the end, wide clearing at the end, no idle
  motion with reduced motion, the scene appears all at once, prerendered heading and `noscript`,
  no overscroll bounce.

### Left to the builder

- How to split code between the Svelte component and TypeScript modules.
- Exact bake resolutions per leaf kind, and the resolution cap, provided the targets are met
  and the 1440×900 look matches today's at a glance.
- How to reproduce the leaf tilt (`rotate3d` today) in 2D: a small skew or scale, or drop it if
  it's invisible at its ~4° size.
- How to blur far layers (pre-blurred bake, `BlurFilter` into a `RenderTexture`, or similar),
  within the "no per-frame full-screen blur" anti-goal.
- Whether to batch far leaves into containers or keep one sprite each.

## Verification

Done when, on the production build:

- All the tests above pass, including the original spec's verification list (adapted to the new
  structure), `pnpm check` and `pnpm lint`.
- Side-by-side screenshots against the current build at 0%, 50% and 100% scroll at 1440×900 and
  390×844, for the owner to judge *(Claude's call: not an automated pixel diff, which would need
  a test-only switch to freeze idle motion)*. Bake-resolution tuning includes one review round
  with the owner on these pairs.
- Manual check by the owner on their own screen: scroll through, switch tabs, come back. The logo
  stays, and the leaves don't change.
