# Jungle reveal — the arch and the title

Date: 2026-10-31
Status: approved by owner (2026-10-31)
Amends: `2026-10-22-jungle-reveal-design.md` (the end state of the scroll, the page length, and the
"edges covered at every scroll position" guarantee) and builds on
`2026-10-30-jungle-pixi-renderer-design.md` (the PixiJS renderer, Tasks 1–4 done). Everything else
in those specs still stands.

## Why

The homepage is a scroll-driven reveal: the visitor scrolls, the jungle parts, the logo comes
forward. Today it ends in an oval clearing with leaves on every edge, which leaves no room to put
anything under the logo. The owner wants the page to end with room for content at the bottom, a real
visible title, and a clearing that reads as an opening onto the page rather than a hole in the
foliage.

Owner mockups (browser companion, 2026-10-31) settled the end state; see "Final frame" below.

## Amendment (2026-10-31, owner-approved): the title as two lines

Supersedes the single-line title wherever this spec describes it (goal 5, the final frame's title
line, the reduced-motion and phone decisions, and `titleLayout`'s font rule):

- **Two lines in the one `<h1>`.** "Toma Nistor" on one line, its font sized so the rendered text is
  as wide as the resting logo (measured from the real text, at every screen size). "San Diego
  Software Engineer" on the line below, about 40% of the name's font size *(Claude's call)*,
  centred, `#212121`. The gap from the logo to the name is as before; the subtitle sits close under
  the name. The `<h1>` still reads "Toma Nistor – San Diego Software Engineer" to search engines and
  screen readers (e.g. a visually hidden en dash between the lines). `<title>` and the meta
  description are unchanged.
- **Sequential, scroll-tied fade-in.** In phase 2 the name fades in while rising about one
  line-height into place over roughly the middle of the phase; the subtitle starts once the name is
  about halfway in and finishes as the phase ends *(Claude's call on the windows)*. Scrolling back up
  reverses it (subtitle out first). Each line rises a short distance rather than travelling up from
  below the viewport.
- **In sync with the logo** (owner, 2026-10-31): the lines are anchored to the logo as it lifts and shrinks — the name always sits the set gap below the logo's current bottom edge — so text and logo move together and never overlap at any point in the phase.
- **Reduced motion:** both lines fade in place, no rise, still in sequence.
- **No-WebGL and no-JS:** both lines show, following the same rules as the canvas page and the
  noscript layout respectively.
- The bottom-middle stays pure white.

## Amendment (2026-10-31, owner-approved): the title's typeface

Supersedes the title's font, case and subtitle size above (the motion and layout rules stand):

- **Typeface:** Inter Tight (free, SIL OFL), self-hosted with the site — no requests to Google at
  runtime. Only free fonts are acceptable for this site.
- **Name:** "TOMA NISTOR" in capitals (CSS `uppercase`; the DOM text stays "Toma Nistor"), weight 900
  (Black), letter-spacing −0.01em, a slightly widened word space so the two words don't run
  together, fitted so the line is exactly the resting logo's width.
- **Subtitle:** "SAN DIEGO SOFTWARE ENGINEER" in capitals, weight 600 (SemiBold), fitted to the same
  width as the name (and the logo), with a 12px floor; on narrow screens where the floor applies it
  may run wider than the logo, still centred. The earlier "about 40% of the name" rule no longer
  applies.
- Fitting must use the loaded font (wait for it before measuring), on every build.
- Approved mockup: `.superpowers/brainstorm/89811-1793495998/content/heading-font-v5.html`, option B.

## Goal

Extend the reveal with a second scroll phase that opens the bottom of the screen into an arch,
lifts and shrinks the logo, and brings the title up under it, leaving a clear white area at the
bottom for future content.

## Goals

1. **Wider opening at the end of phase 1.** At the point where today's reveal ends, the clearing is
   visibly wider than today: fewer leaves, more white page.
2. **Phase 2: the bottom opens.** Scrolling on, the leaves along the bottom middle leave the frame.
   The clearing becomes one continuous arch shaped like an upside-down U: a round top, sides that
   drop almost straight down, and the opening running out through the bottom edge. Leaves stay
   across the top and down both sides, ending in a small wedge of leaves in each bottom corner.
   It must never read as two openings (a "figure 8").
3. **The shading opens with it.** The shadow ring on the white page behind the leaves
   (`shadeGradient`'s ellipse, drawn as the shade sprite) and the lens vignette over the stage
   (`[data-vignette]`) both open at the bottom in step with the leaves. At the end of phase 2 the
   bottom-middle area is pure white: no tint from either.
4. **The logo lifts and shrinks.** During phase 2 the logo moves up a little and shrinks to about
   two-thirds of its phase-1 end size.
5. **The title rises.** During phase 2, the text "Toma Nistor – San Diego Software Engineer" slides
   up from below the viewport and stops just under the logo.
6. **The title is the page's heading and name.** That text is the page's single `<h1>` (visible, real
   text, not drawn in the canvas) and the document `<title>`. The page gets a meta description.
7. **The bottom stays empty.** Below the title, the bottom-middle of the screen is blank white. It is
   reserved for content added later; nothing goes there now.

## Final frame (owner-approved mockup, 1440×900)

Approximate, read as proportions, not pixel targets:

- Logo centre at about 44% of the viewport height; logo width about 22–23% of the viewport width
  (phase-1 end: about 36%).
- Title centred, just under the logo (top of the text at about 64% of the height), set noticeably
  larger than body text: about 2.6% of the viewport width at 1440 wide (about 28px), bold-ish
  sans-serif, near-black like the logo (`#212121`).
- Top of the arch at about 12–15% of the viewport height at the centre.
- Arch sides at about 15–20% and 80–85% of the width, nearly vertical, reaching the bottom edge.
  Leaves fill outside the sides; a small wedge of leaves remains in each bottom corner.
- The owner asked twice for the logo and title not to sit high: the clear white space under the title
  should look intentional, not empty. If in doubt, keep them lower.

### Scaling to other screens *(Claude's call; the owner checks it on the screenshots)*

The 1440×900 numbers above set the look; these rules carry it to other sizes, keyed to the logo the
way the current layout keys off `logoSafeZone`:

- **Logo:** two-thirds of its phase-1 end size at every size (phase-1 size stays
  `min(0.5·w, 0.57·h)`). Its resting centre is lifted from the middle by a share of the viewport
  height, chosen so that at 1440×900 it sits at about 44%.
- **Title:** a fixed gap below the logo's bottom edge, proportional to the logo's height (about 30px
  at 1440×900). Font size scales with the logo's resting width, clamped to a readable range (roughly
  18–40px). On narrow screens it wraps to two lines.
- **Arch:** its sides sit a set distance outside the logo's resting safe zone, measured from the logo
  as the current layout does, and clamped so a phone keeps a visible strip of leaves on each side and
  an ultrawide doesn't open into a sparse void. The top of the arch is likewise keyed to the logo's
  safe zone. The 1440×900 proportions above are the calibration point.

## Where this is heading (not built now)

The owner's picture for later: once there's content, a further phase shrinks the logo a lot, the
title disappears, and the content scrolls up through the open white area while the jungle stays as
the frame. There's no content yet, so none of this is built here, but this work must not get in its
way:

- Keep the jungle pinned (the sticky stage) through the end of phase 2; don't end the page by
  scrolling the scene away.
- Build the logo pose and the title's motion as functions of scroll phase, so a phase 3 can be
  appended without reworking phases 1–2.
- The arch at the end of phase 2 is a resting state that can stay put while later content scrolls
  over the white area.

## Non-goals

- Content in the bottom area, and the later phase that brings it in. It stays blank.
- Navigation, links, or any interactive element in the title.
- Changing the start of the reveal (the closed jungle and the loader hand-off).
- Fixing Lighthouse's missing Largest Contentful Paint. The title starts below the viewport, so it
  won't count as LCP at load; the performance score stays blocked by the canvas. (Raised during
  brainstorming as a hoped-for side effect; it isn't one. Tracked separately.)
- Large-screen tuning and spike removal (Task 5 of the renderer plan). It runs after this work,
  since this changes what it would tune.

## Anti-goals

- **A figure 8.** Any frame in phase 2 where the clearing pinches into an upper and a lower opening
  is a failure, even if the end state is right.
- **Tinted white.** Grey or green cast over the bottom-middle at the end, from the shade, the
  vignette, blurred far layers, or leaf shadows.
- **Floating leaves.** Leaves in phase 2 must leave by moving out through the frame edge, as they
  part in phase 1, never fade out or pop.
- **A jump at the hand-off.** The loader's logo must keep matching the scene's logo at any restored
  scroll position, including in phase 2.
- **Losing what Tasks 1–4 built:** the single WebGL canvas, the memory targets (160MB at
  1440×900@2x, 50MB on a 390×844@3 phone), context-loss recovery, and the fallback logo.

## Constraints

- PixiJS renderer as built in Tasks 3–4 (`src/src/lib/jungle/renderer.ts`, `scene.ts`). Leaves are
  baked once per layout; nothing is re-baked per frame.
- The far layers (`deep`, `backing`) are baked once per build into static textures, fully parted,
  covering 1.5× the viewport. Today they fill the bottom too, so they need to clear the bottom as well.
- Styling uses Tailwind utilities, not custom CSS classes (owner rule).
- Work on the `redesign` branch; no feature branches (owner rule).
- `prefers-reduced-motion`: scroll-driven movement still happens (as today); idle motion doesn't.

## How it gets made

### Decided

- **Two phases on one scroll.** The page grows so phase 2 takes about as much scrolling as phase 1
  (today `h-[300lvh]`; about `h-[500lvh]` after). Phase 1 is the first half of the scroll range and
  behaves as today apart from the wider end; phase 2 is the second half. *(Claude's call on the
  length; the owner agreed to "about as long as the first".)*
- **Wider phase-1 end** comes from the leaf layout (larger logo safe zone and pull at the end), not
  from scaling the scene. *(Claude's call: target at least 1.3× today's `openShare` at 1440×900 at
  the end of phase 1.)*
- **Title in the DOM.** The `<h1>` is real HTML text positioned over the canvas, inside the stage,
  stacked above the vignette so nothing tints it. It replaces the current `sr-only` `<h1>` in `+page.svelte`, so the page keeps exactly one `<h1>`.
  It is prerendered into `build/index.html`.
- **One source of truth for the logo pose.** A single function maps scroll to the logo's scale and
  vertical offset. The renderer, the title position, and the loader's `syncLogo` all use it, so the
  loader hand-off can't drift.
- **Text:** `<title>` and `<h1>`: "Toma Nistor – San Diego Software Engineer" (en dash, matching the
  existing `<h1>`). Meta description *(Claude's draft, owner to confirm at review)*: "Toma Nistor is
  a San Diego software engineer building fast, thoughtfully crafted websites and web apps."
- **Reduced motion:** the title fades in at its resting place instead of sliding. *(Claude's call;
  not objected to.)*
- **Phones:** the same sequence, scaled. The title may wrap to two lines on narrow screens; it stays
  centred under the logo. *(Claude's call.)*
- **`<noscript>`:** shows the logo and the title in their final positions, so the page isn't blank
  without JavaScript. *(Claude's call.)*

### Left to the builder

- How phase 2 moves the leaves: a second per-leaf target, a bottom-weighted pull, or re-assigning
  which leaves exit. Requirements: bottom-middle leaves leave through the bottom (or bottom-sideways)
  edge; side and top leaves stay; the corners keep a wedge; the arch is continuous at every frame.
- How the far layers clear the bottom: baking them in separate pieces (for example, bottom band vs
  the rest) that can slide independently, masking, or another approach within the memory targets.
- How the shade and the vignette open: reshaping the shade texture per phase, sliding a second
  shade piece, or animating the vignette's gradient. Requirement: pure white bottom-middle at the end.
- Easing and staging inside phase 2 (whether the logo, title, and leaves move together or slightly
  staggered), as long as the end state matches.
- Exact title font stack and weight within "clean sans-serif, near-black".

### Tests to update or add

The guarantees of the earlier specs change on purpose; update their tests rather than delete them.

- **Edge coverage** (`e2e/jungle.test.ts`): holds at every scroll position in phase 1 (all four
  sizes). In phase 2 it holds for the top edge and the side edges only.
- **Logo hidden:** about 80% hidden at the start (unchanged); fully visible at the end of phase 1 and
  at the end of phase 2.
- **Wide clearing:** at the end of phase 1, `openShare` is at least 1.3× the value measured on
  today's build at 1440×900.
- **New, bottom clear:** at the end of phase 2, the bottom-middle region (for example, the central
  40% of the width across the bottom 25% of the height) is pure white (every sampled pixel ≥ 250 per
  channel), at all four sizes.
- **New, corners kept:** at the end of phase 2, each bottom corner region has leaves (a meaningful
  share of non-white pixels).
- **New, no figure 8:** at several points in phase 2, the open region is one connected shape (for
  example, a column-by-column scan finds no row band of leaves separating an upper and a lower
  opening along the vertical centre line).
- **New, title:** at the end of phase 2 the `<h1>` is visible, horizontally centred, entirely below
  the logo and within the viewport; at the start it is off-screen. The page has exactly one `<h1>`.
- **Prerender** (`the deployed homepage is prerendered…`): `build/index.html` contains the `<title>`,
  the meta description, and the `<h1>` text.
- **Loader:** `matches the scene logo at a restored scroll position` also checks a phase-2 scroll
  position, using the shared logo-pose function.

## Verification

- All the tests above pass, plus the existing unit, component, and e2e suites; `pnpm check` and
  eslint are clean.
- Screenshots at 1440×900, 3440×1440, 1280×600 and 390×844 at the end of phase 1, mid phase 2, and
  the end of phase 2, shown to the owner next to the approved mockup for sign-off.
- Memory targets still met (`data-gpu-mb` at 1440×900@2x and on the phone profile).
