# Jungle PixiJS Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the homepage jungle with PixiJS in one WebGL canvas, so the logo and every leaf render on any screen and survive tab switches and GPU resets.

**Architecture:** The layout, seeded arrangement and motion maths stay as they are. `motion.ts` returns numeric leaf poses instead of CSS strings. A new `renderer.ts` owns PixiJS: textures, sprites, the two far layers (pre-rendered once into render textures), the shade and the logo. `scene.ts` keeps the frame loop, input, resize and context-loss recovery, and drives the renderer. `JungleScene.svelte` mounts one canvas, the DOM vignette and a fallback logo.

**Tech Stack:** SvelteKit 2 (adapter-static, prerendered), Svelte 5, TypeScript, Tailwind 4, PixiJS 8.22.0, Vitest browser mode, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-jungle-pixi-renderer-design.md`. It amends `docs/superpowers/specs/2026-10-22-jungle-reveal-design.md`; read both.

## Global Constraints

- Work on the `redesign` branch. Do not create feature branches.
- All commands run from `src/` (the app root). pnpm needs `ASDF_PNPM_VERSION=12.5.1` in front of every `pnpm` command.
- `pixi.js` 8.22.0 is imported only dynamically on the client (`await import('pixi.js')`). A static import breaks prerender (`navigator is not defined`). Type-only imports are fine.
- Styling uses Tailwind utilities only, with no custom CSS classes. Per-frame values set from script are not styling.
- Keep `generateLeaves(11, …)`, the `GROUPS` order and counts, and `layoutLeaves` unchanged. The approved arrangement depends on them.
- No full-screen blur per frame. Focus pull is a cross-fade of two pre-rendered layer textures.
- Nothing happens on `visibilitychange`. Resize rules are unchanged: 150ms debounce, ignore unchanged sizes, ignore height-only changes when `(pointer: coarse)` matches.
- Memory targets (`data-gpu-mb`, at 2x): 1440×900 ≤ 160, 2560×1340 ≤ 250, 3440×1440 ≤ 300, 390×844@3x phone ≤ 50.
- Frame targets with the machine's GPU: median ≤ 17.5ms. At 1440×900 with 4x CPU throttle, worst ≤ 20ms. At 2560×1340 and 3440×1440, p95 ≤ 20ms.
- Commit messages follow the repo style (`feat: Capitalised summary`) and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Unit tests: `ASDF_PNPM_VERSION=12.5.1 pnpm vitest run <file>`. E2E: `ASDF_PNPM_VERSION=12.5.1 pnpm playwright test <file>` (its web server builds and previews). Run single files, not the whole suite. Run `pnpm check` after each task.

## Review Focus

- **Two resizes in quick succession** (dragging a window edge). Only the last size's build may land, and the arrangement must match that size. Test in Task 3.
- **The window moves to a display with a different pixel ratio** but the same CSS size. The scene must rebuild at the new resolution rather than stay blurry or oversized. Test in Task 3.
- **The WebGL context is lost before the first frame** (during start-up). `ready` must still resolve, and the scene recovers or shows the fallback logo. Test in Task 4.
- **The context is lost twice in a row.** The second loss recovers like the first. Test in Task 4.
- **Reloading while scrolled to the bottom** (scroll restoration). The first frame starts at the restored scroll, and the logo is fully clear with no camera sweep. Test in Task 5.

---

### Task 1: Numeric leaf poses

**Files:**
- Modify: `src/src/lib/jungle/motion.ts` (replace `stepLeaf`)
- Modify: `src/src/lib/jungle/scene.ts` (format the pose as CSS until Task 3 replaces this file)
- Test: `src/src/lib/jungle/motion.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type LeafPose = {
  	x: number; y: number;          // screen px of the leaf's origin (stem base)
  	rotation: number;              // degrees
  	scaleX: number; scaleY: number; // zoom * flip, zoom
  	tilt: number;                  // degrees about tiltAxis (rotate3d today)
  };
  export function leafPose(leaf: Leaf, f: FrameInput, dt: number): LeafPose;
  ```
  Same maths as today's `stepLeaf`, including the spring and brush side effects on `leaf`. `x = ax`, `y = ay` (today's CSS translate is `ax - origin`, `ay - origin`).

- [ ] **Step 1: Rewrite the `stepLeaf` tests against `leafPose`**
  - `adds no idle stir, flutter or tilt when calm`: for each test leaf, `leafPose(leaf, frame({calm:true,time:3}), 1/60)` and the same at `time: 17` have equal `rotation`, and `tilt === 0`.
  - `keeps brush tilt within 5 degrees`: after repeated sweeps (as today), `Math.abs(pose.rotation - (leaf.rot0! + leaf.swing * leaf.t))` ≤ 5 + the leaf's sway amplitude.
  - `returns an identical pose when nothing changes`: `toEqual` between two calls with the same input after settling.
  - `places the origin where the old transform did`: for a settled leaf, `pose.x - leaf.origin![0]` equals the translate x parsed from a reference string computed with the old formula (copy the old formula into the test as a one-off helper).
- [ ] **Step 2: Run** `pnpm vitest run src/lib/jungle/motion.test.ts`. Expected: FAIL (`leafPose` is not exported).
- [ ] **Step 3: Implement `leafPose` in `motion.ts`** and delete `stepLeaf`. In `scene.ts`, add a local `leafTransform(pose: LeafPose, leaf: Leaf): string` that rebuilds today's exact CSS string (translate3d, rotate, rotate3d with `leaf.tiltAxis`, scale), and use it where `stepLeaf` was used.
- [ ] **Step 4: Run** the motion tests, plus `pnpm vitest run src/lib/components/JungleScene.svelte.test.ts`. Expected: PASS. The DOM scene is unchanged.
- [ ] **Step 5: Commit** `refactor: Return leaf poses as numbers instead of CSS`.

### Task 2: Smaller bakes and a render resolution cap

**Files:**
- Modify: `src/src/lib/jungle/bake.ts`
- Test: `src/src/lib/jungle/bake.svelte.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BAKE_RES: { fg: number; far: number; soft: number; sharp: number }; // bake px per CSS px
  export function renderResolution(v: Viewport, dpr: number): number;
  export function textureMegabytes(bitmaps: Iterable<Bitmap>): number; // replaces bitmapMegabytes
  ```
  - Starting values: `fg: 0.35`, `far: 0.6`, `soft: 0.75` (mid leaves with `defocus > 0`), and `sharp: Math.min(dpr, 1.25)` for sharp mid leaves (passed as a cap; `bake` takes `Math.min(dpr, BAKE_RES.sharp)`). Task 5 tunes these against the targets.
  - `renderResolution`: `Math.min(dpr, Math.sqrt(MAX_RENDER_PIXELS / (v.width * v.height)))` with `MAX_RENDER_PIXELS = 8_300_000` (about 4K), never below 1.

- [ ] **Step 1: Update the bake tests**
  - Replace `bakes foreground bitmaps at half resolution` with one test per kind: canvas width ≤ `box[0] * BAKE_RES.<kind> + 1`.
  - Replace the 135MB test with: `textureMegabytes` of every bitmap (live and far) at dpr 2 and 1440×900 is < 110.
  - `renderResolution`: `({width:1440,height:900}, 2)` → 2; `({width:2560,height:1340}, 2)` ≈ 1.556 (`toBeCloseTo(1.556, 2)`); `({width:3440,height:1440}, 2)` ≈ 1.295; `({width:390,height:844}, 3)` → 3; `({width:7680,height:4320}, 1)` → 1.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/jungle/bake.svelte.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `BAKE_RES`, `renderResolution` and `textureMegabytes`, and switch `bake`'s `want` to `BAKE_RES`. Leave `paintLayer` and `toObjectUrls` alone; Task 3 deletes them.
- [ ] **Step 4: Run** the bake tests. Expected: PASS.
- [ ] **Step 5: Commit** `perf: Bake leaves at lower resolution and cap render resolution`.

### Task 3: PixiJS renderer replaces the DOM scene

**Files:**
- Create: `src/src/lib/jungle/renderer.ts`
- Rewrite: `src/src/lib/jungle/scene.ts`
- Modify: `src/src/lib/components/JungleScene.svelte`
- Modify: `src/src/lib/jungle/bake.ts` (delete `paintLayer`, `toObjectUrls`, `bitmapMegabytes` and their tests)
- Modify: `src/package.json` (move `pixi.js` from `devDependencies` to `dependencies`)
- Test: `src/src/lib/components/JungleScene.svelte.test.ts` (rewrite), `src/e2e/jungle.test.ts` and `src/e2e/measure.ts` (DOM-dependent tests)

**Interfaces:**
- Consumes: `leafPose`/`LeafPose` (Task 1); `bakeAll`, `releaseBitmaps`, `renderResolution`, `textureMegabytes`, `BAKE_RES` (Task 2).
- Produces (`renderer.ts`):
  ```ts
  export type DrawInput = { cam: number; look: { x: number; y: number }; poses: LeafPose[] };
  export type JungleRenderer = {
  	canvas: HTMLCanvasElement;
  	// Replaces every texture and sprite for this layout in one go; draws nothing.
  	build(leaves: Leaf[], bitmaps: Map<string, Bitmap>, v: Viewport, resolution: number): void;
  	draw(input: DrawInput): void;   // poses are in `live` order (leaves where !isFar)
  	gpuMegabytes(): number;         // textures + drawing buffer
  	destroy(): void;
  };
  export function createJungleRenderer(): Promise<JungleRenderer>; // rejects if WebGL is unavailable
  ```
- Produces (stage data attributes, read by the tests): `data-leaves` (live leaf count), `data-drawn` (sprites drawn in the last frame), `data-gpu-mb`, `data-generation` (increments after each completed build).

Renderer decisions:
- PixiJS `Application` with `autoStart: false`, `antialias: false`, white background, `autoDensity: true`. Ticker off; `draw` calls `app.render()`.
- Draw order: shade, logo, deep layer (sharp, soft), backing layer (sharp, soft), live leaves.
- Far layers: on `build`, render each layer's leaves (fully parted, as `paintLayer` does today) once into two `RenderTexture`s covering 1.5× the viewport: sharp and soft, each through a `BlurFilter` (today's sharp/soft blur amounts) at reduced resolution (deep 0.5/0.35, backing 0.75/0.5 of CSS px to start). Destroy the temporary far sprites afterwards. Per frame, set only position, scale and the soft sprite's alpha (`1 - cam`), as today.
- Shade: a quarter-resolution canvas texture of `shadeGradient`'s ellipse (see the spike).
- Logo: rasterise the SVG at `logoW × resolution` (`logoW = min(0.5·w, 0.57·h)`); draw at scale `zoomAt(LOGO_DIST, cam)`.
- Leaf sprites: `anchor = origin / box`; `scale = pose.scale × box / texture size`; `rotation = pose.rotation` in radians. Tilt: fold it into a small `skew` along `tiltAxis`, or drop it if it's invisible. Implementer's call, per the spec.
- Textures are created from the baked canvases. After upload, `releaseBitmaps` (the spec's memory decision). `build` destroys the previous build's textures and sprites.

Scene decisions (`scene.ts`, same exported signature as today: `createJungleScene(els): { ready: Promise<void>; destroy(): void }`, with `els` now `{ stage, fallbackLogo }`):
- Decode source images, generate and lay out leaves, `bakeAll(…, renderResolution(v, dpr))`, then `renderer.build`, set the camera and leaf springs from the current scroll, draw the first frame, then resolve `ready`.
- Resize: as today, but also rebuild when `devicePixelRatio` changes at the same size. A generation counter discards stale builds.

- [ ] **Step 1: Rewrite `JungleScene.svelte.test.ts`**, keeping the existing `renderReady` helper:
  - `becomes ready and draws the live leaves`: `data-leaves` > 100, `data-drawn` equals `data-leaves`, `data-gpu-mb` > 0, and exactly one `canvas` in the stage.
  - `still becomes ready when one image fails`: the `decode` spy as today; `data-leaves` is lower than without the failure.
  - `darkens the edges with a vignette above the canvas`: the vignette's computed `z-index` is greater than the canvas's, it has `pointer-events: none`, and its background is a `radial-gradient`.
  - `ignores a resize event when the size has not changed`: dispatch `resize`, wait 3s, and `data-generation` is unchanged.
  - `keeps leaf count across a resize`: `page.viewport(1280, 800)`, wait for `data-generation` to increment, and `data-leaves` is unchanged.
  - `only the last of two quick resizes lands`: `page.viewport(1280, 800)`, then `page.viewport(1200, 760)` within 50ms. Wait until `data-generation` settles; it incremented exactly once, and the canvas client size is 1200×760.
  - `rebuilds when the pixel ratio changes`: redefine `window.devicePixelRatio` to 1, dispatch `resize`, and `data-generation` increments.
  - `stops the frame loop and removes the canvas on destroy`: as today, but assert no `canvas` remains.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/components/JungleScene.svelte.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `renderer.ts`, the new `scene.ts` and the component changes: one container where the canvas mounts, the vignette, and the fallback logo `<img data-fallback-logo hidden>` with today's logo classes and start transform. Hook up Task 4's fallback by unhiding it. For now, unhide it only if `createJungleRenderer` rejects. Delete the dead `bake.ts` exports and their tests, and move `pixi.js` into `dependencies`.
- [ ] **Step 4: Run** the component tests and the bake tests. Expected: PASS.
- [ ] **Step 5: Update the DOM-dependent e2e tests** in `e2e/jungle.test.ts`. Add `screenshotDiff(page, a, b): Promise<number>` to `measure.ts`: the share of sampled pixels differing by more than 8 per channel, computed in-page the way `pixelShare` is.
  - `stageMb` reads `data-gpu-mb`.
  - `about 80% of the logo is hidden…`: the "full" reference hides `canvas` and `[data-vignette]` and shows `[data-fallback-logo]` at `transform: translate(-50%, -50%) !important` (scale 1, the end state).
  - `no leaf moves while idle with reduced motion`: two screenshots 4s apart; `screenshotDiff` is 0.
  - `the scene appears all at once`: when the loader has `opacity-0`, `data-drawn` equals `data-leaves`.
- [ ] **Step 6: Run** `pnpm playwright test e2e/jungle.test.ts`. Expected: PASS (all four edge-coverage sizes, logo share, clearing, memory 160/50, reduced motion, appears at once, prerender, overscroll).
- [ ] **Step 7: Run** `pnpm check` and `pnpm lint`. Expected: no errors.
- [ ] **Step 8: Commit** `feat: Draw the jungle with PixiJS in a single canvas`.

### Task 4: Context-loss recovery and the fallback logo

**Files:**
- Modify: `src/src/lib/jungle/scene.ts`
- Modify: `src/src/lib/jungle/renderer.ts` (accept an `onContextLost` callback)
- Test: `src/src/lib/components/JungleScene.svelte.test.ts`, `src/e2e/jungle.test.ts`

**Interfaces:**
- Consumes: Task 3's `createJungleRenderer`, `JungleRenderer`.
- Changes: `createJungleRenderer(onContextLost: () => void)`. The renderer listens for `webglcontextlost` on its canvas and calls the callback.
- Produces: stage `data-renderer`: `"webgl"` while drawing, `"recovering"` during a rebuild after a loss, `"fallback"` when the fallback logo is shown.

Decisions:
- On loss: stop drawing, destroy the renderer, then create a new renderer (new canvas) and re-bake from the kept decoded images with the same leaves, viewport and current scroll state. No loader.
- Show the fallback logo whenever `createJungleRenderer` rejects, a build throws, or recovery fails. `ready` resolves on every path, and errors are logged as today (`'Jungle scene failed to start'`).

- [ ] **Step 1: Write the tests**
  - Unit `shows the fallback logo when WebGL is unavailable`: spy on `HTMLCanvasElement.prototype.getContext` to return `null` for `webgl`/`webgl2`. `ready` resolves, `data-renderer` is `fallback`, and the fallback logo is visible (not `hidden`).
  - Unit `shows the fallback logo when preparing the leaves fails`: spy `CanvasRenderingContext2D.prototype.drawImage` to throw. `ready` resolves, `console.error` is called with `'Jungle scene failed to start'`, and `data-renderer` is `fallback`.
  - Unit `recovers when the context is lost before the first frame`: lose the context immediately after `createJungleRenderer` resolves (spy on the module or dispatch `webglcontextlost` on the first canvas created). `ready` resolves, and `data-renderer` ends as `webgl` or `fallback`, never stuck on `recovering`.
  - E2E `redraws the same scene after the GPU context is lost`: emulate reduced motion and scroll to 0.5. Take a screenshot, call `getExtension('WEBGL_lose_context').loseContext()` on the canvas's context, wait for `data-renderer="webgl"` with a higher `data-generation`, take a screenshot. `screenshotDiff` ≤ 0.01.
  - E2E `recovers from two context losses in a row`: repeat the loss twice. Same assertions after the second.
- [ ] **Step 2: Run** both test files. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** recovery and the fallback paths in `scene.ts`, and the callback in `renderer.ts`.
- [ ] **Step 4: Run** both test files. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Recover from lost GPU contexts and fall back to a plain logo`.

### Task 5: Large-screen targets, tuning and spike removal

**Files:**
- Modify: `src/e2e/jungle-performance.test.ts`, `src/e2e/jungle.test.ts`
- Modify: `src/src/lib/jungle/bake.ts` and `renderer.ts` (tune `BAKE_RES`, `MAX_RENDER_PIXELS` and the far-layer resolutions only as needed)
- Delete: `src/src/routes/spike/`

- [ ] **Step 1: Add GPU e2e tests** to `jungle-performance.test.ts`, which already launches Chrome with the machine's GPU. Use 2x DPR in each:
  - `keeps the logo visible on a large Retina screen` at 2560×1340: at 0.8 and 1 scroll, `logoPixelShare` / full (measured as in `jungle.test.ts`) > 0.98.
  - `keeps graphics memory within target`: one test per size from Global Constraints; `data-gpu-mb` ≤ the target.
  - `holds 60fps on large screens` at 2560×1340 and 3440×1440: `frameStats` extended to return `p95Ms`. Median ≤ 17.5, p95 ≤ 20.
  - The existing 1440×900 throttled test stays as is.
  - In `jungle.test.ts`, `starts at the restored scroll position`: scroll to 1, reload, `waitForScene`. Immediately `logoPixelShare` / full > 0.98.
- [ ] **Step 2: Run** `pnpm playwright test e2e/jungle-performance.test.ts e2e/jungle.test.ts`. Note which targets fail.
- [ ] **Step 3: Tune** `BAKE_RES`, the far-layer render-texture resolutions and `MAX_RENDER_PIXELS` until every target passes. Lower the blurred kinds first (fg, soft, far), and sharp mid leaves last. Rerun the edge-coverage and logo-share tests after each change.
- [ ] **Step 4: Owner review round.** Capture screenshot pairs (current `origin/redesign` build vs this build) at 0%, 50% and 100% scroll at 1440×900@2x and 390×844@3x into the scratchpad, show them to the owner, and apply any resolution changes they ask for. Do not commit the screenshots.
- [ ] **Step 5: Delete** `src/src/routes/spike/`. Run `pnpm check`, `pnpm lint` and both e2e files. Expected: PASS.
- [ ] **Step 6: Commit** `perf: Meet the memory and frame targets on large screens`.
