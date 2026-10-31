# Jungle Arch and Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second scroll phase that opens the bottom of the jungle into an upside-down-U arch, lifts and shrinks the logo, and brings a real `<h1>` title up under it.

**Architecture:** One module (`phases.ts`) turns scroll into two progress values: phase 1 drives today's reveal (`cam`) and phase 2 drives the opening (`open`). It also owns the logo's pose and the title's resting layout. The layout computes, per leaf, an extra exit distance that clears an arch zone keyed to the logo's resting safe zone. The renderer applies it with `open`, splits each far layer into a resting part and an exiting part, and cross-fades the shade from oval to arch. The title is DOM text the scene positions each frame.

**Tech Stack:** SvelteKit 2 / Svelte 5, PixiJS 8 (WebGL), Tailwind 4, Vitest (browser + node projects), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-jungle-arch-and-title-design.md` (read it first). It builds on `docs/superpowers/specs/2026-10-30-jungle-pixi-renderer-design.md`.

## Global Constraints

- Branch `redesign` only; never create a feature branch.
- Tailwind utilities only; no custom CSS classes.
- Title and `<h1>` text, exactly: `Toma Nistor – San Diego Software Engineer` (en dash). Exactly one `<h1>` on the page.
- Meta description, exactly: `Toma Nistor is a San Diego software engineer building fast, thoughtfully crafted websites and web apps.`
- Memory: `data-gpu-mb` ≤ 160 at 1440×900@2x and ≤ 50 at 390×844@3 (phone).
- Keep the single WebGL canvas, context-loss recovery and the fallback logo working.
- Leaves leave by moving out through the frame edge, never by fading.
- Run commands from `src/` with `ASDF_PNPM_VERSION=12.5.1`. Lint is `pnpm prettier --check src e2e && pnpm eslint .`; `pnpm lint` fails on `.prettierrc` and `eslint.config.js`, which were already failing and are out of scope. Type check is `pnpm check`.
- Stage only the files your task names; `.superpowers/` and `.playwright-mcp/` stay untracked.

## Review Focus

1. **Reloading mid-way through or at the end of phase 2.** The scene should start already open (bottom clear, logo at rest), not animate from closed. Test in Task 4.
2. **Resizing while open.** A rebuild at the end of phase 2 should keep the bottom clear and the arch shape at the new size. Test in Task 4.
3. **Phone width.** The title wraps to two lines, stays horizontally centred, sits below the logo and stays inside the viewport. Test in Task 5.
4. **Reduced motion.** The title fades in at its resting place rather than sliding, and is fully shown at the end. Test in Task 5.
5. **No WebGL.** The fallback still shows a readable title, not one stranded off-screen. Test in Task 5.

---

### Task 1: Scroll phases and the shared logo pose

**Files:**
- Create: `src/src/lib/jungle/phases.ts`, `src/src/lib/jungle/phases.test.ts`
- Modify: `src/src/lib/jungle/motion.ts` (`leafTarget`, `FrameInput`), `src/src/lib/jungle/scene.ts`, `src/src/lib/jungle/renderer.ts` (`DrawInput`, logo placement), `src/src/lib/jungle/layout.ts` (`logoSafeZone` uses `logoWidth`), `src/src/lib/components/JungleLoader.svelte` (`syncLogo`), `src/src/lib/components/JungleScene.svelte` (`h-[300lvh]` → `h-[500lvh]`)
- Test: `phases.test.ts`, `motion.test.ts`, `JungleLoader.svelte.test.ts`, `e2e/jungle.test.ts`, `e2e/measure.ts`

**Interfaces:**
- Produces (`phases.ts`):
  ```ts
  export const PHASE_SPLIT = 0.5;
  export const LOGO_REST_SCALE = 2 / 3;
  export const LOGO_REST_DY = -0.06; // resting logo centre, as a share of viewport height from the middle
  export function revealAt(scroll: number): number; // clamp01(scroll / PHASE_SPLIT)
  export function camAt(scroll: number): number;    // smoothstep(revealAt(scroll))
  export function openAt(scroll: number): number;   // smoothstep(clamp01((scroll - PHASE_SPLIT) / (1 - PHASE_SPLIT)))
  export function logoWidth(v: Viewport): number;   // min(0.5·w, 0.57·h): the phase-1 logo width
  export type LogoPose = { scale: number; dy: number }; // drawn width = scale × logoWidth(v); dy = px below centre
  export function logoPose(cam: number, open: number, v: Viewport): LogoPose;
  // scale = zoomAt(LOGO_DIST, cam) × (1 − (1 − LOGO_REST_SCALE) × open); dy = open × LOGO_REST_DY × v.height
  ```
- Changes: `FrameInput` gains `open: number`. `DrawInput` gains `open: number`. `leafTarget(leaf, scroll)` keeps its signature but reads `revealAt(scroll)`, so leaves finish parting at the end of phase 1.
- Scene: `camera` springs to `camAt(s)`, and a new `opening` spring (k 16, ζ 1, like `camera`) springs to `openAt(s)`. At start, both springs are set directly from the current scroll, as `camera.t` is today.

- [ ] **Step 1: Write the failing tests**
  - `phases.test.ts` (node project):
    - `camAt(0.25)` ≈ 0.5, `camAt(0.5)` = 1, `camAt(1)` = 1.
    - `openAt(0.5)` = 0, `openAt(0.75)` ≈ 0.5, `openAt(1)` = 1.
    - `logoPose(1, 0, {1440, 900})` is `{ scale: 1, dy: 0 }`.
    - `logoPose(1, 1, {1440, 900})` has `scale` ≈ 2/3 and `dy` ≈ −54.
    - `logoWidth({3440, 1440})` ≈ 820.8.
  - `motion.test.ts`: `leafTarget` spans 0..1 by scroll 0.5 (`leafTarget(leaf, 0.5) === 1`) and stays monotonic.
  - `JungleLoader.svelte.test.ts` (`matches the scene logo at a restored scroll position`): compute the expected width as `logoPose(camAt(s), openAt(s), stage).scale × logoWidth(stage)`. Run the test for one position in phase 1 (s ≈ 0.4) and one in phase 2 (s ≈ 0.9).
- [ ] **Step 2: Run** `pnpm vitest run src/lib/jungle/phases.test.ts src/lib/jungle/motion.test.ts src/lib/components/JungleLoader.svelte.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `phases.ts`, and wire it into `leafTarget`, the scene springs, `DrawInput`, the renderer's logo, `syncLogo` and `logoSafeZone`.
  - The renderer places the logo at `y = h/2 + pose.dy − look.y × parallax`, with width `pose.scale × logoWidth(v)`.
  - The loader's logo transform becomes `translate(-50%, calc(-50% + {dy}px)) scale({scale})`.
- [ ] **Step 4: Update the e2e scroll positions** in `e2e/jungle.test.ts`. Also change `scrollTo` in `e2e/measure.ts`: after scrolling, poll two screenshots 500ms apart until `screenshotDiff` is 0, up to 10s. (The scene keeps moving for about 4s after a scroll.)
  - **Edge coverage:** check `[0, 0.125, 0.25, 0.375, 0.5, 1]`, all edges.
  - **Logo hidden test:**
    - "None hidden" moves to `scrollTo(page, 0.5)`.
    - Add the end-of-phase-2 check: `end / full` is between `0.98 × LOGO_REST_SCALE²` and `1.02 × LOGO_REST_SCALE²`. The reference is the fallback logo at scale 1.
  - **Wide clearing:** `scrollTo(page, 0.5)`, threshold unchanged (0.28).
- [ ] **Step 5: Run** the unit and component tests from Step 2, then `pnpm playwright test e2e/jungle.test.ts`. Expected: PASS.
- [ ] **Step 6: Run** `pnpm check` and lint. Expected: clean.
- [ ] **Step 7: Commit** `feat: Split the scroll into a reveal and an opening phase`.

### Task 2: A wider opening at the end of phase 1

**Files:**
- Modify: `src/src/lib/jungle/layout.ts`, `src/src/lib/jungle/renderer.ts` (`paintShade` uses `openingZone`)
- Test: `src/src/lib/jungle/layout.test.ts`, `e2e/jungle.test.ts`

**Interfaces:**
- Produces (`layout.ts`):
  ```ts
  export const OPEN_WIDEN = 1.25; // starting value; tune up until the e2e threshold below passes
  export function openingZone(v: Viewport): { safeW: number; safeH: number }; // logoSafeZone(v) × OPEN_WIDEN
  ```
- `layoutLeaves`: `hits` tests against `openingZone(v)`. The inset roll-back threshold becomes `vmin × 0.14 × OPEN_WIDEN`. `logoSafeZone` itself is unchanged.

- [ ] **Step 1: Write the failing tests**
  - `layout.test.ts`: `clears the logo safe zone once fully parted` asserts against `openingZone(v)`. `caps inset leaf travel` uses the bound `0.14 × vmin × OPEN_WIDEN`.
  - `e2e/jungle.test.ts`: `leaves a wide clearing around the logo at the end of the reveal` asserts `openShare ≥ 0.39` at `scrollTo(page, 0.5)`, at 1440×900. Today's value is 0.303, measured 2026-10-31, and 0.39 is 1.3× that.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/jungle/layout.test.ts` and `pnpm playwright test e2e/jungle.test.ts -g "wide clearing"`. Expected: FAIL.
- [ ] **Step 3: Implement** `openingZone` and use it in `layoutLeaves` and `paintShade`.
- [ ] **Step 4: Run** the layout tests, then the full `e2e/jungle.test.ts`. Expected: PASS. If the wide-clearing check fails, raise `OPEN_WIDEN` in steps of 0.05. Edge coverage at all four sizes and the ~80%-hidden start must still pass.
- [ ] **Step 5: Commit** `feat: Part the leaves wider at the end of the reveal`.

### Task 3: Leaves leave the arch in phase 2

**Files:**
- Modify: `src/src/lib/jungle/leaves.ts` (`Leaf.exit`), `src/src/lib/jungle/layout.ts`, `src/src/lib/jungle/motion.ts` (`leafPose`), `src/src/lib/jungle/renderer.ts` (far layers)
- Test: `layout.test.ts`, `motion.test.ts`, `e2e/jungle.test.ts`, `e2e/measure.ts`

**Interfaces:**
- Consumes: `logoWidth`, `LOGO_REST_SCALE`, `LOGO_REST_DY` (Task 1); `FrameInput.open`, `DrawInput.open` (Task 1).
- Produces (`layout.ts`):
  ```ts
  // Centre-relative px at cam 1. The opening: |x| < half, and either below cy or inside the top half-ellipse.
  export type Arch = { cy: number; half: number; rTop: number };
  export function archZone(v: Viewport): Arch;
  export function inArch(x: number, y: number, a: Arch): boolean;
  // |x| < a.half && (y >= a.cy || (x / a.half) ** 2 + ((y - a.cy) / a.rTop) ** 2 < 1)
  ```
  `archZone` is keyed to the resting logo. Take `w = logoWidth(v) × LOGO_REST_SCALE`, `h = w × 197 / 225` and `vmin = min(width, height)`. Then:
  - `cy = LOGO_REST_DY × v.height`
  - `rTop = h/2 + 0.13 × vmin`
  - `half = min(w/2 + 0.13 × vmin + 0.22 × vmin, 0.34 × v.width)`
- `Leaf.exit?: number`, set by `layoutLeaves` and always ≥ 0:
  - **Live leaves:** extra travel along `n`, beyond `pull`, until the blade samples clear `archZone`.
  - **Far leaves:** a downward drop (along `[0, 1]`) from the fully parted position until they clear it.
  - Grow it in steps of `0.02 × vmin` from 0, for at most 500 steps.
- `leafPose`: the travel along `n` becomes `pull × t + (exit ?? 0) × f.open`.
- Renderer: each far role bakes two parts, `rest` (leaves with `exit === 0`) and `exit` (the others), each with its sharp and soft copy. Each frame, the `exit` sprites move down by `open × max(exit)` of that role.

- [ ] **Step 1: Write the failing tests**
  - `layout.test.ts`, `archZone`:
    - At 1440×900: `half` ≈ 486 (±3), and the arch top (`cy − rTop`) ≈ −321 (±5).
    - At 390×844: `half` = 0.34 × 390.
    - At 3440×1440: `half` ≈ 778 (±3).
  - `layout.test.ts`, `clears the arch once open` (each viewport): no live leaf's blade sample, placed at `anchor + n × (pull + exit)`, is `inArch`. No far leaf's sample, placed at `anchor + n × pull + [0, exit]`, is either. Reuse the blade sampling from `clears the logo safe zone`.
  - `motion.test.ts`, `moves a leaf out by its exit as the arch opens`: with `t` settled at 1, the pose anchor at `open: 1` minus the pose at `open: 0` equals `n × exit × zoom`.
  - `e2e/measure.ts`: let `whiteFractionInEdgeBand(page, band, edges)` take a subset of `'top' | 'right' | 'bottom' | 'left'`. Add `regionShare(page, rect: { x0: number; y0: number; x1: number; y1: number }, test: 'white' | 'pure' | 'open' | 'leaf')`, with the rect in viewport fractions. `'pure'` means every channel ≥ 250; `'leaf'` means not `'open'`.
  - `e2e/jungle.test.ts`:
    - Edge coverage at scroll `0.75` and `1` checks only `['top', 'left', 'right']`, with band 0.1.
    - New: `keeps leaves in both bottom corners when open`. At `scrollTo(page, 1)`, `regionShare` with `'leaf'` is ≥ 0.5 for `{x0: 0, y0: 0.85, x1: 0.1, y1: 1}` and its mirror, at all four sizes.
- [ ] **Step 2: Run** the layout and motion tests and the two e2e tests. Expected: FAIL.
- [ ] **Step 3: Implement** `archZone`, `inArch`, the `exit` computation in `layoutLeaves`, `leafPose`, and the renderer's split far layers.
- [ ] **Step 4: Run** the layout, motion and component tests, then the full `e2e/jungle.test.ts`. Expected: PASS, including both memory limits.
- [ ] **Step 5: Commit** `feat: Open the jungle into an arch as the visitor scrolls on`.

### Task 4: The shading opens at the bottom

**Files:**
- Modify: `src/src/lib/jungle/renderer.ts` (second shade texture), `src/src/lib/jungle/scene.ts` (`--open` on the stage), `src/src/lib/components/JungleScene.svelte` (two vignettes)
- Test: `e2e/jungle.test.ts`, `e2e/measure.ts`, `src/src/lib/components/JungleScene.svelte.test.ts`

**Interfaces:**
- Consumes: `archZone`, `inArch` (Task 3); `opening` spring (Task 1).
- Renderer: `paintArchShade(v)` paints the shade at the same `SHADE_RES`, clear inside `archZone(v)` and darkening outside with the oval shade's colour stops. The oval shade draws at alpha `1 − open` and the arch shade at alpha `open`.
- Scene: each frame, it writes `open` (rounded to 3 decimals) to the stage as the CSS custom property `--open`, only when it changes.
- Component:
  - The oval vignette keeps today's gradient, with opacity `calc(1 - var(--open, 0))`.
  - A second vignette (`data-vignette="arch"`) darkens only the top and the sides (Tailwind arbitrary `bg-[…]` gradients), with opacity `var(--open, 0)`.
  - Both use `pointer-events-none` and the same `z-[500]`.

- [ ] **Step 1: Write the failing tests** in `e2e/jungle.test.ts`:
  - `leaves the bottom middle pure white when open`: at `scrollTo(page, 1)`, `regionShare(page, {x0: 0.3, y0: 0.75, x1: 0.7, y1: 1}, 'pure')` is 1, at all four sizes.
  - `opens as one arch, never a figure 8`: at scroll 0.6, 0.75, 0.9 and 1 (1440×900 and 390×844), the centre strip `x 0.48..0.52` holds exactly one run of open rows (rows sampled every 2px; a row is open when ≥ 50% of its pixels pass `'open'`). Add it as `openRuns(page): Promise<number>` in `measure.ts`.
  - `starts open when reloaded at the end` (Review Focus 1): `scrollTo(page, 1)`, `page.reload()`, `waitForScene`. Without waiting for the scene to settle, the bottom-middle region is already `'pure'`.
  - `stays open across a resize` (Review Focus 2): at the end, `setViewportSize(1280, 800)`, wait for `data-generation` to increase, then the bottom-middle region is `'pure'`.
  - `JungleScene.svelte.test.ts`: two `[data-vignette]` elements, both above the canvas and `pointer-events: none`. Replace the single-vignette test.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the arch shade, `--open` and the vignettes.
- [ ] **Step 4: Run** the component tests and the full `e2e/jungle.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Open the shading at the bottom with the leaves`.

### Task 5: The title, the page head and the fallbacks

**Files:**
- Modify: `src/src/lib/components/JungleScene.svelte` (the `<h1>`), `src/src/lib/jungle/scene.ts` (title position; fallback layout), `src/src/lib/jungle/phases.ts` (`titleLayout`), `src/src/routes/+page.svelte` (remove the `sr-only` `<h1>`; `<svelte:head>`; `<noscript>`)
- Test: `phases.test.ts`, `JungleScene.svelte.test.ts`, `JungleScene.fallback.svelte.test.ts`, `e2e/jungle.test.ts`

**Interfaces:**
- Produces (`phases.ts`):
  ```ts
  // At rest: px from the viewport top to the title's top, and its font size.
  export function titleLayout(v: Viewport): { top: number; fontSize: number };
  ```
  Take `w = logoWidth(v) × LOGO_REST_SCALE`, `h = w × 197 / 225` and `dy = LOGO_REST_DY × v.height`. Then:
  - `top = v.height/2 + dy + h/2 + 0.1 × h`
  - `fontSize = min(40, max(18, 0.082 × w))`
- `SceneElements` gains `title: HTMLElement`.
- Each frame, the scene sets the title's `transform` to `translateY(px)`, interpolating from `v.height` (just below the screen) to `titleLayout(v).top` by `open`.
  - With reduced motion, it stays at `top` and its `opacity` follows `open`.
  - The font size is set on build.
- `fallBack` puts the fallback logo and the title at the resting layout (`logoPose(1, 1, v)` and `titleLayout(v)`).
- The `<h1 data-title>` sits in the stage at `z-[600]`, full width, centred, semibold, `text-[#212121]`, `text-balance`. Before the scene runs it sits below the stage.
- `<svelte:head>` in `+page.svelte` holds the exact `<title>` and meta description from Global Constraints.
- `<noscript>` shows the logo at width `calc(min(50vw,57vh)*2/3)`, centred 44% down, with the title under it.

- [ ] **Step 1: Write the failing tests**
  - `phases.test.ts`:
    - `titleLayout({1440, 900})`: `top` ≈ 576 (±2), `fontSize` ≈ 28 (±0.5).
    - `titleLayout({390, 844})`: `fontSize` = 18.
    - For all three test viewports, `top` is below the resting logo's bottom edge.
  - `JungleScene.svelte.test.ts`: exactly one `h1` in the document, with the exact text, above the vignettes in z-order.
  - `JungleScene.fallback.svelte.test.ts`: in both fallback cases the `h1` is inside the viewport, below the fallback logo's bounding box, and visible (Review Focus 5).
  - `e2e/jungle.test.ts`:
    - `brings the title up under the logo`: at scroll 0 the `h1`'s top is ≥ the viewport height. At scroll 1, at all four sizes, the `h1` is fully inside the viewport and horizontally centred (±2px). Its top is ≥ the logo's bottom: measure the logo by scanning for the last row with `'logo'` pixels above the title.
    - On 390×844 (Review Focus 3), the `h1` box is two lines tall or fewer, and its bottom is above `0.75 × height`.
    - `fades the title in place with reduced motion` (Review Focus 4): at scroll 0.75 the `h1`'s top equals its top at scroll 1 (±1px), its opacity is between 0 and 1, and at scroll 1 its opacity is 1.
    - The prerender test also asserts that `build/index.html` contains `<title>Toma Nistor – San Diego Software Engineer</title>`, the exact meta description, and exactly one `<h1`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `titleLayout`, the `<h1>`, the scene's title motion and fallback layout, and the head and `<noscript>`.
- [ ] **Step 4: Run** `phases.test.ts`, every file in `src/lib/components`, and the full `e2e/jungle.test.ts`. Expected: PASS.
- [ ] **Step 5: Run** `pnpm check` and lint. Expected: clean.
- [ ] **Step 6: Commit** `feat: Bring the title up under the logo and name the page`.

### Task 6: Verification and the owner's screenshots

**Files:** none committed.

- [ ] **Step 1: Run** every client and server unit test (`pnpm vitest run`), `pnpm playwright test e2e/jungle.test.ts`, `pnpm check` and lint. Expected: all PASS.
- [ ] **Step 2: Capture** reduced-motion screenshots, after the scene settles, at 1440×900, 3440×1440, 1280×600 and 390×844. Take each at scroll 0.5 (end of the reveal), 0.75 (mid-opening) and 1 (rest). Save them under `.superpowers/sdd/2026-10-31-jungle-arch-and-title/`.
- [ ] **Step 3: Hand off** the screenshots and the approved mockup (`.superpowers/brainstorm/23720-1793476802/content/opening-shape-v4.html`, option A) to the owner for sign-off. Apply any tuning they ask for as a follow-up commit (`OPEN_WIDEN`, `LOGO_REST_DY`, the arch margins, `titleLayout`).
