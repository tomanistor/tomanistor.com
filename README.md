<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/logo-dark-theme.svg">
  <img src=".github/readme/logo.svg" alt="Toma Nistor logo" width="120">
</picture>

# tomanistor.com

My personal site. Scroll through a jungle to find my name.

[**Visit the site**](https://tomanistor.com) &nbsp;·&nbsp; [The old site](https://github.com/tomanistor/tomanistor.com/releases/tag/hugo-site)

[![SvelteKit](https://img.shields.io/badge/SvelteKit-3-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/docs/kit)
[![PixiJS](https://img.shields.io/badge/PixiJS-8-E72264)](https://pixijs.com/8.x/guides)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/docs)
[![Netlify](https://img.shields.io/badge/Netlify-hosted-00C7B7?logo=netlify&logoColor=white)](https://docs.netlify.com)
[![Sentry](https://img.shields.io/badge/Sentry-errors-362D59?logo=sentry&logoColor=white)](https://docs.sentry.io/platforms/javascript/guides/sveltekit/)

</div>

<br>

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/readme/start.jpg" alt="The page at the top: dense jungle with the logo peeking through"><br><sub><b>Start</b> · the jungle hides the logo</sub></td>
    <td align="center" width="33%"><img src=".github/readme/reveal.jpg" alt="Halfway: the leaves have parted around the logo"><br><sub><b>Scroll</b> · the leaves part</sub></td>
    <td align="center" width="33%"><img src=".github/readme/rest.jpg" alt="The end: an arch of leaves around the logo, name and social links"><br><sub><b>Rest</b> · the arch opens, the name fades in</sub></td>
  </tr>
</table>

## Quick start

You need Node 26.13.0 and pnpm 12.5.1. Both are pinned in `src/.tool-versions` for asdf, and pnpm also in `packageManager`.

```sh
cd src
pnpm install
pnpm dev        # http://localhost:5173
```

## Commands

Run these from `src/`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Static build into `src/build` |
| `pnpm preview` | Serves the build on port 4173 |
| `pnpm check` | Type check |
| `pnpm lint` | Prettier and ESLint |
| `pnpm vitest run` | Unit and component tests |
| `pnpm playwright test` | Browser tests against a production build |

> [!NOTE]
> The Playwright tests start their own server on port 4173, so stop `pnpm preview` first. On macOS they run Chromium with `--use-angle=metal`. Headless Chromium otherwise draws WebGL in software, too slowly for the scene to settle.

## What's inside

| | |
| --- | --- |
| **Framework** | SvelteKit 3 and Svelte 5, prerendered to static HTML |
| **Scene** | PixiJS 8, one WebGL canvas |
| **Styles** | Tailwind CSS 4, Inter Tight for the title |
| **Tests** | Vitest and Playwright |
| **Errors** | Sentry, reporting from tomanistor.com only |
| **Hosting** | Netlify |

```
src/
  src/lib/jungle/      the scene: layout, motion, baking, rendering
  src/lib/components/  JungleScene and JungleLoader
  src/routes/          the homepage and the 404 page
  src/hooks.client.ts  Sentry setup
  e2e/                 Playwright tests
  static/_redirects    redirects for the old site's URLs
  vite.config.ts       SvelteKit, Sentry and Vitest config (there's no svelte.config.js)
docs/superpowers/      design specs and implementation plans
```

## How the scene works

Scrolling drives two phases on a sticky stage:

1. **Reveal.** The leaves part and the camera moves in until the logo sits in a wide clearing.
2. **Opening.** The bottom leaves slide away into an arch, the logo settles, then the name, subtitle and links fade up one after another.

Everything is tied to scroll position, so scrolling back up plays it in reverse.

<details>
<summary><b>The files behind it</b></summary>

<br>

| File | Job |
| --- | --- |
| `leaves.ts`, `layout.ts` | Generate the leaves from a fixed seed and place them for the viewport, including how far each moves to clear the opening and the arch |
| `phases.ts` | Turns scroll into the two phases and owns the logo, title and footer positions, so the canvas, loader and fallback always agree |
| `bake.ts` | Paints each leaf once per layout (shading, shadow, depth blur). Nothing re-bakes per frame |
| `renderer.ts` | Uploads the bitmaps as textures and pre-renders the blurred background layers |
| `scene.ts` | Runs the frame loop and rebuilds on resize, pixel ratio changes and lost GPU contexts |
| `pace.ts` | Splits the build into ~8ms slices so the page stays responsive while it loads |

All in `src/src/lib/jungle/`. Memory and frame-time targets per screen size are in `docs/superpowers/specs/2026-10-30-jungle-pixi-renderer-design.md`.

</details>

<details>
<summary><b>When things aren't ideal</b></summary>

<br>

- **No WebGL:** a plain logo and title that still follow the scroll.
- **No JavaScript:** a `<noscript>` block shows the final layout.
- **Reduced motion:** idle movement stops and text fades in place instead of rising.
- **Lost GPU context:** the scene rebuilds itself from the images it already has.

</details>

## Deployment

Netlify builds from the `src` base directory with `src/netlify.toml`. Pushes to `master` go to production and every pull request gets a deploy preview.

Sentry is set up in `src/src/hooks.client.ts` and only reports from tomanistor.com, so local runs, the e2e suite and deploy previews stay out of it. To get readable stack traces, set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` in Netlify. The build then uploads source maps and deletes them before publishing.

Old URLs from the previous site (`/about`, `/blog/*`, `/gallery/*`, `/tags/*`, `/categories/*`) redirect home with a 301. Anything else that doesn't exist gets a real 404 page.

## The old site

The Hugo site that ran from 2017 to 2026 is archived under the [`hugo-site`](https://github.com/tomanistor/tomanistor.com/tree/hugo-site) tag, source and submodules included. The [release](https://github.com/tomanistor/tomanistor.com/releases/tag/hugo-site) has a ready-built copy to serve locally, or check it out with:

```sh
git clone --recurse-submodules --branch hugo-site https://github.com/tomanistor/tomanistor.com.git tomanistor-hugo
```
