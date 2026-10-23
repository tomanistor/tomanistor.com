# Jungle Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the approved jungle-reveal mockup to the tomanistor.com homepage as Svelte components and TypeScript modules, with no visible difference in look or motion.

**Architecture:** Pure TypeScript modules hold everything that is arithmetic (random generation, leaf geometry, camera, springs, per-frame transforms) and are unit-tested in Node. A small browser layer bakes shared leaf bitmaps and paints the far layers to canvas, and a scene runtime drives the frame loop. Two Svelte components (scene, loader) provide Tailwind-styled markup and start the runtime on mount; the homepage composes them.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Tailwind 4, adapter-static (prerendered), Vitest 3 (node + browser projects), Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-22-jungle-reveal-design.md`
**Reference implementation:** `docs/superpowers/specs/jungle-reveal-reference.html` (cited below as `REF:<line>`). It is the source of truth for every tuned value. Port values verbatim; do not re-tune.

All paths below are relative to the repo root. The SvelteKit app lives in `src/`, so its source is `src/src/`. Run every command from `src/`.

## Global Constraints

- Styling uses Tailwind utility classes only — no `<style>` blocks, no custom CSS classes. Only values computed at runtime (transforms, opacity, sizes, gradients) are set from script.
- The homepage must still prerender (`export const prerender = true` stays). No `window`/`document` access outside `onMount` or browser-only modules called from it.
- The page has a visually hidden `<h1>`: `Toma Nistor – San Diego Software Engineer` (class `sr-only`). Do not change the assertions in `src/src/routes/page.svelte.spec.ts` or `src/e2e/demo.test.ts`.
- Leaf arrangement is seeded with `mulberry32(11)`. Keep `GROUPS` order and counts from `REF:187-195`; reordering reshuffles the approved arrangement.
- Every random value for a leaf is drawn once in generation, never during layout (the reference draws `between(0.01, 0.05)` inside layout at `REF:356`; move that draw into generation as `retract`).
- Assets are the WebPs already produced for the mockup in `.superpowers/brainstorm/38347-1792721928/content/`: plants at 1600px wide, the sheet at 2000×2000. Crop/base/tip/stemEnd coordinates stay in original pixel space (sheet 2000, plants 1800) and are scaled by `naturalWidth / coordWidth`.
- Resize: debounce 150ms; ignore height-only changes when `matchMedia('(pointer: coarse)')` matches; size the scene from the large viewport (`lvh`).
- `prefers-reduced-motion: reduce` disables idle stir, flutter, tilt, parallax and brushing; scroll reveal still works.
- Pointer effects respond only to `pointerType === 'mouse'`.
- No image credits anywhere on the site.
- Work on branch `redesign`; commit after each task.

## Review Focus

- **Page loaded at a restored scroll position** (refresh mid-page, back navigation): the scene must start at that scroll state with no jump, and the loader's logo must match the scene logo's scale at that scroll, not at 0. → Task 6, test `loader logo matches scene logo at a restored scroll position`.
- **A leaf image fails to load or decode:** the visitor must not be stuck on a white loader. The loader reveals the logo, and the scene shows without the failed plant. → Task 5, test `scene still becomes ready when one image fails`; Task 6 hand-off uses `ready`, which must resolve.
- **JavaScript disabled:** the prerendered page must show the logo, not an empty loader. → Task 6, test `no-JS render shows the logo`.
- **Desktop window resized to a new aspect ratio:** the scene re-lays out with the same arrangement, without duplicate leaf elements or leaked blob URLs. → Task 5, test `resize keeps leaf count and arrangement`.
- **Extreme aspect ratios** (ultrawide 3440×1440, short 1280×600): the screen edges stay covered. → Task 7, edge-coverage test runs at these sizes too.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/src/lib/assets/jungle/*.webp` | Leaf images (copied from the mockup folder, renamed) |
| `src/src/lib/jungle/random.ts` | Seeded PRNG |
| `src/src/lib/jungle/sprites.ts` | Plant metadata and weighted plant picking |
| `src/src/lib/jungle/camera.ts` | Camera constants, zoom, parallax, easing helpers |
| `src/src/lib/jungle/leaves.ts` | Leaf types, groups, deterministic generation, density |
| `src/src/lib/jungle/layout.ts` | Per-viewport leaf geometry, bake keys, safe zone, shade gradient |
| `src/src/lib/jungle/motion.ts` | Springs, scroll targets, per-frame leaf transform |
| `src/src/lib/jungle/bake.ts` | Browser: shared bitmaps, far-layer canvases, blob URLs |
| `src/src/lib/jungle/scene.ts` | Browser: scene runtime (load, layout, frame loop, input, resize) |
| `src/src/lib/components/JungleScene.svelte` | Scene markup (Tailwind) and lifecycle |
| `src/src/lib/components/JungleLoader.svelte` | Loader markup (Tailwind), fill animation, hand-off |
| `src/src/routes/+page.svelte` | Homepage: hidden h1, scene, loader, no-JS fallback |
| `src/e2e/jungle.test.ts`, `src/e2e/measure.ts` | Production-build verification against the spec |

---

### Task 1: Assets, random, sprites, camera, leaf generation

**Files:**
- Create: `src/src/lib/assets/jungle/` (9 WebPs), `src/src/lib/jungle/random.ts`, `sprites.ts`, `camera.ts`, `leaves.ts`
- Test: `src/src/lib/jungle/leaves.test.ts`

**Interfaces:**
- Produces:
  - `random.ts`: `mulberry32(seed: number): () => number`; `between(rand: () => number, a: number, b: number): number`
  - `camera.ts`: `DOLLY = 0.8`, `DEPTH_SPREAD = 2.2`, `LOGO_DIST = 3.6`, `DEEP_DIST = 9`, `BACK_DIST = 7`; `zoomAt(dist: number, cam: number): number`; `parallaxAt(dist: number, vmin: number): number`; `smoothstep(t: number): number`; `clamp01(t: number): number` (formulas `REF:172-184,316,466-467`)
  - `sprites.ts`: `type Sprite = { src: string; coordWidth: number; crop: [number, number, number, number]; base: [number, number]; tip: [number, number]; stemEnd?: [number, number]; size: number; weight: number; hi?: boolean }`; `SPRITES: readonly Sprite[]` (order and values from `REF:117-143`); `pickSprite(rand: () => number, depth: number, role: Role): Sprite` (`REF:161-169`)
  - `leaves.ts`: `type Role = 'deep' | 'backing' | 'frame' | 'core' | 'foreground'`; `type Leaf` (all generated fields from `REF:197-231` plus `retract: number`, plus layout fields typed optional-until-layout: `anchor, n, pull, dir0, len, rot0, cssPerPx, key, box, origin`); `GROUPS` (`REF:187-195`); `generateLeaves(seed: number, density: number): Leaf[]` (sorted by `dist` descending); `densityFor(width: number, height: number): number` (`REF:157`); `isFar(leaf: Leaf): boolean`

- [ ] **Step 1: Copy assets.** Copy from `.superpowers/brainstorm/38347-1792721928/content/` to `src/src/lib/assets/jungle/`: `leaves.webp→monstera-sheet.webp`, `leaf-n1→lady-palm`, `leaf-n2→fan-palm`, `leaf-n4→leafy-bush`, `leaf-n5→fern`, `leaf-n6→monstera-dark`, `leaf-n7→monstera-stem`, `leaf-n8→ribbed-leaf`, `leaf-n9→banana-leaf` (all `.webp`). Run `du -ch src/lib/assets/jungle/*.webp | tail -1`; expected ≈ 2.0M.

- [ ] **Step 2: Write the failing tests** in `leaves.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateLeaves, densityFor, GROUPS } from './leaves';
import { mulberry32 } from './random';

describe('generateLeaves', () => {
	it('is deterministic for a seed', () => {
		expect(generateLeaves(11, 1)).toEqual(generateLeaves(11, 1));
	});
	it('produces the full group counts at density 1', () => {
		const total = GROUPS.reduce((s, g) => s + g.count, 0);
		expect(generateLeaves(11, 1)).toHaveLength(total);
	});
	it('scales counts by density with a floor of 2 per group', () => {
		const expected = GROUPS.reduce((s, g) => s + Math.max(2, Math.round(g.count * 0.45)), 0);
		expect(generateLeaves(11, 0.45)).toHaveLength(expected);
	});
	it('never gives a stemmed plant to a leaf set inside the scene', () => {
		for (const leaf of generateLeaves(11, 1)) {
			if (leaf.role === 'core' || leaf.role === 'deep') expect(leaf.sprite.stemEnd).toBeUndefined();
		}
	});
	it('uses only high-resolution plants for the foreground', () => {
		for (const leaf of generateLeaves(11, 1).filter((l) => l.role === 'foreground')) expect(leaf.sprite.hi).toBe(true);
	});
	it('draws retract within 0.01–0.05', () => {
		for (const leaf of generateLeaves(11, 1)) {
			expect(leaf.retract).toBeGreaterThanOrEqual(0.01);
			expect(leaf.retract).toBeLessThanOrEqual(0.05);
		}
	});
	it('sorts back to front', () => {
		const d = generateLeaves(11, 1).map((l) => l.dist);
		expect(d).toEqual([...d].sort((a, b) => b - a));
	});
});

describe('densityFor', () => {
	it('clamps to 0.45–1', () => {
		expect(densityFor(1440, 900)).toBe(1);
		expect(densityFor(390, 844)).toBeCloseTo(0.45);
		expect(densityFor(3440, 1440)).toBe(1);
	});
});

describe('mulberry32', () => {
	it('matches the reference sequence', () => {
		const r = mulberry32(11);
		expect([r(), r(), r()].map((v) => v.toFixed(6))).toMatchSnapshot();
	});
});
```

- [ ] **Step 3: Run** `pnpm vitest run --project server src/lib/jungle/leaves.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 4: Implement** `random.ts`, `camera.ts`, `sprites.ts`, `leaves.ts`. In `sprites.ts`, import each WebP (`import ladyPalm from '$lib/assets/jungle/lady-palm.webp'`) and set `coordWidth` to 2000 for the sheet, 1800 otherwise. In `generateLeaves`, draw fields in exactly the reference's order (`REF:199-229`), then draw `retract` last per leaf, so the approved arrangement is preserved.

- [ ] **Step 5: Run** the same command. Expected: PASS (snapshot written on first run).

- [ ] **Step 6: Commit**

```bash
git add src/lib/assets/jungle src/lib/jungle
git commit -m "feat: Add jungle leaf assets and deterministic leaf generation"
```

---

### Task 2: Layout geometry

**Files:**
- Create: `src/src/lib/jungle/layout.ts`
- Test: `src/src/lib/jungle/layout.test.ts`

**Interfaces:**
- Consumes: `Leaf`, `generateLeaves`, `isFar` (Task 1); `zoomAt`, `parallaxAt` (Task 1)
- Produces:
  - `type Viewport = { width: number; height: number }`
  - `logoSafeZone(v: Viewport): { safeW: number; safeH: number }` (`REF:328-330`)
  - `layoutLeaves(leaves: Leaf[], v: Viewport): void` — assigns `anchor, n, pull, dir0, len, rot0, cssPerPx, key` (`REF:324-386`, with the inset-reduction loop and the foreground extra pull; `pull` starts from `leaf.retract * vmin`)
  - `bakeKey(leaf: Leaf): string` (`REF:253-257`)
  - `shadeGradient(v: Viewport): string` (`REF:429-431`)

- [ ] **Step 1: Write the failing tests** in `layout.test.ts`, at viewports 1440×900, 390×844, 3440×1440:

```ts
it('roots every stemmed plant off-screen at the start', () => {
	// for frame/backing/foreground leaves with sprite.stemEnd: anchor * zoomAt(dist, 0)
	// lies outside the viewport rectangle centred on 0 (|x| > w/2 or |y| > h/2)
});
it('clears the logo safe zone once fully parted', () => {
	// for live leaves: sample the parted blade at fractions [0, .2, .4, .6, .8, 1]
	// with the same lateral widths as REF:357-363; none lies inside logoSafeZone
});
it('caps inset leaf travel at 8% of vmin unless rooted at the minimum inset', () => {
	// for core leaves: pull <= 0.08 * vmin + 0.02 * vmin (one step)
});
it('is stable across repeated layouts', () => {
	// layoutLeaves twice on the same leaves → identical anchors, pulls, rot0
});
it('draws nearer leaves larger than farther ones, all else equal', () => {
	// for leaves of the same sprite, cssPerPx / (sprite.size * scale) strictly decreases as dist increases
});
```

Fill each body from its comment; the assertions use `expect(...).toBe/toBeLessThanOrEqual`.

- [ ] **Step 2: Run** `pnpm vitest run --project server src/lib/jungle/layout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layout.ts` by porting `REF:303-386,429-431`, minus baking and DOM.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: Add jungle leaf layout geometry"` (add `src/lib/jungle/layout*`).

---

### Task 3: Motion

**Files:**
- Create: `src/src/lib/jungle/motion.ts`
- Test: `src/src/lib/jungle/motion.test.ts`

**Interfaces:**
- Consumes: `Leaf` with layout fields (Tasks 1–2), camera helpers
- Produces:
  - `spring(state: { t: number; v: number }, target: number, k: number, zeta: number, dt: number): void` (`REF:475-481`)
  - `leafTarget(leaf: Leaf, scroll: number): number` (`REF:470-473`)
  - `scrollFraction(scrollY: number, scrollHeight: number, viewportHeight: number): number`
  - `type FrameInput = { scroll: number; cam: number; time: number; look: { x: number; y: number }; sweep: number; pointer: { x: number; y: number } | null; calm: boolean; width: number; height: number }`
  - `stepLeaf(leaf: Leaf, f: FrameInput, dt: number): string` — advances the leaf's scroll spring (zeta 1) and brush spring (k 9, zeta 0.85), applies idle stir, flutter, tilt, brush and parallax, returns the CSS transform string (`REF:540-582`)
  - `outwardSweep(prev: {x,y} | null, next: {x,y}, width: number, height: number): number` (`REF:519-528`, capped at 60)

- [ ] **Step 1: Write the failing tests:**

```ts
it('spring with zeta 1 never overshoots', () => {
	const s = { t: 0, v: 0 };
	for (let i = 0; i < 600; i++) { spring(s, 1, 16, 1, 1 / 60); expect(s.t).toBeLessThanOrEqual(1 + 1e-6); }
	expect(s.t).toBeCloseTo(1, 3);
});
it('leafTarget is monotonic in scroll and spans 0..1', () => {
	// for every leaf of generateLeaves(11, 1): leafTarget(leaf, 0) === 0, leafTarget(leaf, 1) === 1,
	// and values at scroll = 0, 0.05, …, 1 never decrease
});
it('outwardSweep is zero when moving toward the centre', () => {
	expect(outwardSweep({ x: 100, y: 100 }, { x: 300, y: 250 }, 1440, 900)).toBe(0);
	expect(outwardSweep({ x: 600, y: 400 }, { x: 400, y: 300 }, 1440, 900)).toBeGreaterThan(0);
});
it('calm frames add no idle stir, flutter or tilt', () => {
	// two stepLeaf calls at different `time` with calm: true and a settled leaf
	// return the same transform string
});
it('brush tilt stays within 5 degrees', () => {
	// repeated max sweeps through a leaf: |tanh(brush.t) * 5| <= 5
});
```

- [ ] **Step 2: Run** `pnpm vitest run --project server src/lib/jungle/motion.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `motion.ts` by porting the per-leaf body of `frame()` into `stepLeaf`. Keep toFixed precisions from the reference, so unchanged values produce identical strings.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: Add jungle motion and per-frame leaf transforms"`.

---

### Task 4: Baking and far layers (browser)

**Files:**
- Create: `src/src/lib/jungle/bake.ts`
- Test: `src/src/lib/jungle/bake.svelte.test.ts` (runs in the Vitest browser project)

**Interfaces:**
- Consumes: `Leaf` after `layoutLeaves`, `bakeKey`, `isFar`, `Viewport`
- Produces:
  - `type Bitmap = { canvas: HTMLCanvasElement; cssPerPx: number; box: [number, number]; origin: [number, number] }`
  - `bakeAll(leaves: Leaf[], images: Map<string, HTMLImageElement>, dpr: number): Map<string, Bitmap>` — one bitmap per key at the largest `cssPerPx` among its leaves; assigns each leaf's scaled `box` and `origin` (`REF:259-298, 389-401`; resolutions: foreground 0.5, far 1, middle `min(dpr, 1.5)`, cap 2200px)
  - `paintLayer(sharp: HTMLCanvasElement, soft: HTMLCanvasElement, group: Leaf[], bitmaps: Map<string, Bitmap>, v: Viewport, sharpRes: number, softRes: number, sharpBlur: number, softBlur: number): void` (`REF:437-459`; called with `0.75, 0.35, 1.2, 3` for deep and `1, 0.5, 0.5, 1.6` for backing)
  - `toObjectUrls(keys: string[], bitmaps: Map<string, Bitmap>): Promise<Map<string, string>>` (WebP at quality 0.9)
  - `bitmapMegabytes(keys: string[], bitmaps: Map<string, Bitmap>): number`
  - `releaseBitmaps(bitmaps: Map<string, Bitmap>): void`

- [ ] **Step 1: Write the failing tests:** with leaves from `generateLeaves(11, 1)` laid out at 1440×900 and images loaded from the real assets:
  - `bakes one bitmap per key`: `bitmaps.size` equals the number of distinct `bakeKey`s, and is < 60.
  - `live bitmap memory at dpr 2 is under 135MB`: `bitmapMegabytes(liveKeys, bitmaps) < 135`.
  - `foreground bitmaps are baked at half resolution`: canvas width ≤ 0.5 × box width × 1.25 (pad).
  - `far layers are 1.5x the viewport at their resolution`: after `paintLayer`, `sharp.width === Math.round(1440 * 1.5 * sharpRes)`.
- [ ] **Step 2: Run** `pnpm vitest run --project client src/lib/jungle/bake.svelte.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `bake.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: Bake shared jungle leaf bitmaps and far layers"`.

---

### Task 5: Scene runtime and JungleScene component

**Files:**
- Create: `src/src/lib/jungle/scene.ts`, `src/src/lib/components/JungleScene.svelte`
- Test: `src/src/lib/components/JungleScene.svelte.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4
- Produces:
  - `type SceneElements = { stage: HTMLElement; logo: HTMLElement; shade: HTMLElement; deepSharp: HTMLCanvasElement; deepSoft: HTMLCanvasElement; backSharp: HTMLCanvasElement; backSoft: HTMLCanvasElement }`
  - `createJungleScene(els: SceneElements): { ready: Promise<void>; destroy(): void }`. `ready` resolves once every live leaf image is decoded, appended, and the first frame is drawn. It also resolves if any plant image fails, with that plant's leaves dropped. After layout, it sets `stage.dataset.bitmapMb` (live bitmaps plus layer canvases) and `stage.dataset.leaves` (live leaf count) for e2e.
  - `JungleScene.svelte` props: `{ onready?: () => void }`. It renders the scroller (`h-[300lvh]`), the sticky stage (`sticky top-0 h-lvh w-screen overflow-hidden bg-white contain-strict`), the shade (`absolute -inset-[40%] pointer-events-none`), the logo (`absolute left-1/2 top-1/2 w-[min(50vw,57vh)] -translate-x-1/2 -translate-y-1/2`, using `$lib/assets/logo/toma-nistor-logo.svg`, alt `Toma Nistor - San Diego Software Engineer`), and four layer canvases (`absolute -left-1/4 -top-1/4 h-[150%] w-[150%] pointer-events-none will-change-transform`, z-index 1 for deep and 2 for backing). Live leaves get `absolute left-0 top-0 max-w-none pointer-events-none select-none will-change-transform`, `alt=""`, `draggable=false` and `data-key` set to their bake key. The whole stage is `aria-hidden="true"` except the logo. On mount it calls `createJungleScene` and calls `onready` when `ready` resolves; on destroy it calls `destroy()`.

- [ ] **Step 1: Write the failing tests** (Vitest browser, real assets):
  - `becomes ready and renders the live leaves`: render, await `onready`, expect `stage.dataset.leaves` > 100 at the default test viewport, and that count of `img` elements in the stage (plus the logo).
  - `scene still becomes ready when one image fails`: stub `HTMLImageElement.prototype.decode` to reject for the fern's URL. `onready` still fires and no leaf uses the fern.
  - `resize keeps leaf count and arrangement`: record the sequence of leaf `data-key`s, resize the test viewport to a new width (`page.viewport(1280, 800)` from `@vitest/browser/context`), wait 300ms. Same sequence of `data-key`s, and every `blob:` URL from before has been revoked (spy on `URL.revokeObjectURL`).
  - `destroy removes leaves and stops the frame loop`.
- [ ] **Step 2: Run** `pnpm vitest run --project client src/lib/components/JungleScene.svelte.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `scene.ts` (port `REF:484-603` plus the startup at `REF:626-647`, minus the loader). Write styles through a `setStyle` that skips unchanged values (`REF:497-502`). Ignore height-only resizes when `matchMedia('(pointer: coarse)').matches`. Then implement `JungleScene.svelte`.
- [ ] **Step 4: Run.** Expected: PASS. Also run `pnpm check`. Expected: 0 errors.
- [ ] **Step 5: Commit** `git commit -m "feat: Add jungle scene runtime and component"`.

---

### Task 6: Loader, homepage, no-JS fallback

**Files:**
- Create: `src/src/lib/components/JungleLoader.svelte`
- Modify: `src/src/routes/+page.svelte` (replace contents)
- Test: `src/src/routes/page.svelte.spec.ts` (unchanged, must pass), `src/src/lib/components/JungleLoader.svelte.test.ts`

**Interfaces:**
- Consumes: `zoomAt`, `smoothstep`, `scrollFraction`, `LOGO_DIST` (Tasks 1, 3); `JungleScene` (Task 5)
- Produces: `JungleLoader.svelte` props `{ done: boolean }`. It renders a fixed white cover (`fixed inset-0 z-[2000] bg-white transition-opacity duration-[900ms]`) containing the logo box (`absolute left-1/2 top-1/2 w-[min(50vw,57vh)] aspect-[225/197] overflow-hidden`) and the four nested window edges from `REF:96-105`: each edge is `absolute inset-0 overflow-hidden will-change-transform`, each counter child `absolute inset-0 will-change-transform`. The edges are server-rendered already in their closed start positions (inline `transform` on each edge and counter child, e.g. top edge `translateY(50%)` / its child `translateY(-50%)`), and the logo box with `scale(0.818)`, so the prerendered page never flashes the full logo before hydration. On mount it sets the logo box transform to `translate(-50%,-50%) scale(zoomAt(LOGO_DIST, smoothstep(scrollFraction(...))))` and starts the fill (`REF:609-620`: open 50%→0 vertically, delay 200, 1000ms; spread 40%→0 horizontally, delay 1150, 900ms; easing `cubic-bezier(0.45, 0, 0.25, 1)`; counters move opposite). When `done` is true and the spread animation has finished, it waits one frame, fades to opacity 0, then unmounts itself on `transitionend`.
- `+page.svelte`: `<h1 class="sr-only">Toma Nistor – San Diego Software Engineer</h1>`, `<JungleScene onready={() => (ready = true)} />`, `<JungleLoader done={ready} />`, and `<noscript>` containing the plain logo positioned like the scene logo above the loader (`fixed left-1/2 top-1/2 z-[2001] w-[min(50vw,57vh)] -translate-x-1/2 -translate-y-1/2 scale-[0.818]`).

- [ ] **Step 1: Write the failing tests** in `JungleLoader.svelte.test.ts`:
  - `reveals nothing outside the window`: pause all animations at 150, 450, 800, 1500, 2200ms. Compute the window as the intersection of the four edge rects with the logo box. Expect the logo `img` to have no visible area outside it: the window is empty at 150ms and the full box at 2200ms.
  - `starts closed before any animation runs`: render with animations paused at time 0; the window has zero height.
  - `stays until done, then fades and unmounts`: with `done=false`, the cover is still present after 3s. Set `done=true`; it is gone within 1.5s.
  - `loader logo matches scene logo at a restored scroll position`: render the page at a 50% scroll offset. At hand-off, the loader logo's and the scene logo's `getBoundingClientRect()` match within 0.5px.
- [ ] **Step 2: Run** `pnpm vitest run --project client src/lib/components/JungleLoader.svelte.test.ts src/routes/page.svelte.spec.ts`. Expected: loader tests FAIL; the page spec FAILS (no h1).
- [ ] **Step 3: Implement** `JungleLoader.svelte` and the new `+page.svelte`.
- [ ] **Step 4: Run** the same command. Expected: all PASS. Then run `pnpm check && pnpm lint`. Expected: clean.
- [ ] **Step 5: Verify no-JS render:** `pnpm build`, then `grep -c 'Toma Nistor – San Diego Software Engineer' build/index.html` (expected ≥ 1) and `grep -c '<noscript>' build/index.html` (expected ≥ 1).
- [ ] **Step 6: Commit** `git commit -m "feat: Add logo-fill loader and jungle homepage"`.

---

### Task 7: Production-build verification

**Files:**
- Create: `src/e2e/measure.ts`, `src/e2e/jungle.test.ts`
- Test: `src/e2e/demo.test.ts` (unchanged, must pass)

**Interfaces:**
- Produces, in `measure.ts`:
  - `whiteFractionInEdgeBand(page: Page, band = 0.15): Promise<number>` — screenshot, analysed in-page via canvas; white means all channels > 232
  - `visibleLogoFraction(page: Page): Promise<number>` — logo-colour (#212121 ±8) pixels at the current scroll ÷ the same at 100%
  - `frameStats(page: Page): Promise<{ medianMs: number; worstMs: number }>` — rAF timing across 10 × 120px `scrollBy` at 60ms intervals
  - `scrollTo(page: Page, fraction: number): Promise<void>` — scroll, then wait 3500ms to settle

- [ ] **Step 1: Write the tests** in `jungle.test.ts`. Each waits for the loader to unmount first.
  - `edges are covered at every scroll position`: at 1440×900, 3440×1440, 1280×600 and 390×844, for fractions 0, .25, .5, .75, 1, expect `whiteFractionInEdgeBand(page) <= 0.0005`.
  - `about 80% of the logo is hidden at the start and none at the end`: at 1440×900, `visibleLogoFraction` at 0 is between 0.15 and 0.25, and at 1 it is > 0.98.
  - `holds 60fps on a slow CPU at 2x`: CDP `Emulation.setDeviceMetricsOverride` with deviceScaleFactor 2, plus `setCPUThrottlingRate` 4. `medianMs <= 17.5`, `worstMs <= 20`.
  - `graphics memory stays in budget`: `stage.dataset.bitmapMb <= 160` at 2x 1440×900; `<= 50` at 3x 390×844.
  - `no leaf moves while idle with reduced motion`: `page.emulateMedia({ reducedMotion: 'reduce' })`. Leaf transforms are identical across 4s.
  - `the scene appears all at once`: while the loader is present, no `img` with a `blob:` src is visible above it. At the moment the loader starts fading, the leaf count equals `stage.dataset.leaves`.
- [ ] **Step 2: Run** `pnpm exec playwright test`. Expected: all PASS, including `demo.test.ts`. If a visual-parity check fails, compare against the reference served from the mockup folder at the same viewport and scroll, and fix the port rather than the threshold.
- [ ] **Step 3: Visual parity check:** screenshot the production build and the reference at 0%, 50% and 100% at 1440×900 and 390×844, and compare them side by side. Record any differences in the commit message. Expected: none visible.
- [ ] **Step 4: Commit** `git commit -m "test: Verify jungle reveal against spec targets"`.

---

## Out of scope (from the spec)

Content below the reveal, the phone-specific clearing shape, chunked baking, WebGL. Real-device testing (iPhone Safari, real laptop) happens after this plan, by the owner.
