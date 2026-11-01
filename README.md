# tomanistor.com

My personal site. It's a single page: a scroll-driven jungle that parts to reveal my logo, then opens into an arch with my name, title and links underneath.

Live at [tomanistor.com](https://tomanistor.com).

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) with Svelte 5, prerendered to static HTML with `adapter-static`
- [PixiJS 8](https://pixijs.com) for the scene, drawn into one WebGL canvas
- [Tailwind CSS 4](https://tailwindcss.com)
- Inter Tight for the title, bundled from [`@fontsource/inter-tight`](https://fontsource.org/fonts/inter-tight)
- Vitest and Playwright for tests
- Hosted on Netlify

## Repo layout

```
src/                  the site (SvelteKit app, run everything from here)
  src/lib/jungle/     the scene: layout, motion, baking, rendering
  src/lib/components/ JungleScene and JungleLoader
  src/routes/         the homepage and the 404 page
  e2e/                Playwright tests
  static/_redirects   Netlify redirects for the old site's URLs
archive/              the old Hugo site, kept for reference and not built
docs/superpowers/     design specs and implementation plans
```

## How the scene works

The page is a tall scroll area with a sticky stage on top. Scrolling drives two phases:

1. **Reveal** (first half of the scroll). The leaves part and the camera dollies in until the logo sits in a wide clearing.
2. **Opening** (second half). The bottom leaves slide out of frame so the clearing becomes an arch, the logo lifts and shrinks to its resting size, then the name, subtitle and social links fade up in sequence.

Everything that moves is a function of scroll, so it all reverses when you scroll back up. The rest is in `src/lib/jungle/`:

- `leaves.ts` and `layout.ts` generate the leaves from a fixed seed and place them for the current viewport, including how far each one moves to clear the opening and the arch.
- `phases.ts` turns scroll into the two phases and owns the logo, title and footer poses, so the canvas, the loader and the fallback all agree on where things are.
- `bake.ts` paints each leaf once per layout (shading, drop shadow, depth blur) into a bitmap. Nothing gets re-baked per frame.
- `renderer.ts` uploads those bitmaps as textures and pre-renders the far background layers into blurred render textures.
- `scene.ts` runs the frame loop and rebuilds on resize, pixel ratio changes and lost GPU contexts.
- `pace.ts` splits the bake into ~8ms slices so the main thread stays responsive while the scene builds.

It degrades on purpose:

- Without WebGL, you get a plain logo and title that still follow the scroll.
- Without JavaScript, a `<noscript>` block shows the final layout.
- With reduced motion turned on, idle movement stops and the text fades in place instead of rising.

Memory is budgeted per screen size and big screens render at a capped resolution. The targets are in `docs/superpowers/specs/2026-10-30-jungle-pixi-renderer-design.md`.

## Local development

You need Node 20.19.4 (pinned in `src/.tool-versions` for asdf) and pnpm 12.5.1 (pinned in `packageManager`).

```sh
cd src
pnpm install
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:5173 |
| `pnpm build` | Static build into `src/build` |
| `pnpm preview` | Serves the build on http://localhost:4173 |
| `pnpm check` | Type check (svelte-check) |
| `pnpm lint` | Prettier and ESLint |
| `pnpm vitest run` | Unit and component tests (component tests run in Chromium) |
| `pnpm playwright test` | Browser tests against a fresh production build |

FYI the Playwright tests build the site and start their own server on port 4173, so stop any `pnpm preview` first. On macOS they launch Chromium with `--use-angle=metal` (see `playwright.config.ts`). Headless Chromium otherwise renders WebGL in software, too slowly for the scene to settle.

## Deployment

Netlify builds the site from the `src` base directory using `src/netlify.toml` (`pnpm build`, publishing `src/build`). Pushes to `master` deploy to production and every pull request gets a deploy preview.

The old Hugo site's URLs (`/about`, `/blog/*`, `/gallery/*`, `/tags/*`, `/categories/*`) redirect to the homepage with a 301, set in `src/static/_redirects`. Anything else that doesn't exist gets the prerendered 404 page.

## The old site

The previous version of the site, built with Hugo, lives in `archive/` with its own README. It isn't built or deployed anymore.
