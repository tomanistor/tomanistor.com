import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
	lastLogoRowAbove,
	logoPixelShare,
	openRuns,
	openShare,
	regionShare,
	screenshotDiff,
	scrollTo,
	waitForScene,
	whiteFractionInEdgeBand
} from './measure';
import { LOGO_REST_SCALE, logoSize } from '../src/lib/jungle/phases';

test.describe.configure({ timeout: 180000 });

const stageMb = (page: import('@playwright/test').Page) =>
	page.locator('[data-jungle-stage]').evaluate((el) => Number((el as HTMLElement).dataset.gpuMb));

const BOTTOM_MIDDLE = { x0: 0.3, y0: 0.75, x1: 0.7, y1: 1 };

for (const [width, height] of [
	[1440, 900],
	[3440, 1440],
	[1280, 600],
	[390, 844]
]) {
	test(`edges are covered at every scroll position at ${width}×${height}`, async ({ page }) => {
		// Each settled scroll takes up to half a minute at 3440×1440.
		test.setTimeout(300000);
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		for (const fraction of [0, 0.125, 0.25, 0.375, 0.5]) {
			await scrollTo(page, fraction);
			expect(await whiteFractionInEdgeBand(page), `at ${fraction * 100}%`).toBeLessThanOrEqual(
				0.0005
			);
		}
		// Once the arch opens, the bottom edge is open on purpose.
		for (const fraction of [0.75, 1]) {
			await scrollTo(page, fraction);
			expect(
				await whiteFractionInEdgeBand(page, 0.1, ['top', 'left', 'right']),
				`at ${fraction * 100}%`
			).toBeLessThanOrEqual(0.0005);
		}
	});

	test(`leaves the bottom middle pure white when open at ${width}×${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		await scrollTo(page, 1);
		expect(await regionShare(page, BOTTOM_MIDDLE, 'pure')).toBe(1);
	});

	test(`keeps leaves in both bottom corners when open at ${width}×${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		await scrollTo(page, 1);
		for (const rect of [
			{ x0: 0, y0: 0.85, x1: 0.1, y1: 1 },
			{ x0: 0.9, y0: 0.85, x1: 1, y1: 1 }
		]) {
			expect(await regionShare(page, rect, 'leaf'), JSON.stringify(rect)).toBeGreaterThanOrEqual(
				0.5
			);
		}
	});
}

test('about 80% of the logo is hidden at the start, none after the reveal, and it rests smaller', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	// The title's dark text would count as logo pixels.
	await page.addStyleTag({ content: '[data-title] { visibility: hidden }' });
	await scrollTo(page, 0);
	const start = await logoPixelShare(page);
	await scrollTo(page, 0.5);
	const revealed = await logoPixelShare(page);
	await scrollTo(page, 1);
	const end = await logoPixelShare(page);
	// Compare against the fully revealed logo with the leaves hidden.
	await page.addStyleTag({
		content: `canvas, [data-vignette] { visibility: hidden !important }
			[data-fallback-logo] { transform: none !important }`
	});
	await page.locator('[data-fallback-logo]').evaluate((el) => el.removeAttribute('hidden'));
	await page.waitForTimeout(100);
	const full = await logoPixelShare(page);
	expect(start / full).toBeGreaterThanOrEqual(0.15);
	expect(start / full).toBeLessThanOrEqual(0.25);
	expect(revealed / full).toBeGreaterThan(0.98);
	// The logo rests at LOGO_REST_SCALE of its width, so its area shrinks by the square.
	expect(end / full).toBeGreaterThanOrEqual(0.98 * LOGO_REST_SCALE ** 2);
	expect(end / full).toBeLessThanOrEqual(1.02 * LOGO_REST_SCALE ** 2);
});

test.describe('at 2x pixel density', () => {
	test.use({ deviceScaleFactor: 2, viewport: { width: 1440, height: 900 } });

	test('keeps graphics memory within 160MB', async ({ page }) => {
		await page.goto('/');
		await waitForScene(page);
		expect(await stageMb(page)).toBeLessThanOrEqual(160);
	});
});

test.describe('on a phone', () => {
	test.use({
		deviceScaleFactor: 3,
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true
	});

	test('keeps graphics memory within 50MB', async ({ page }) => {
		await page.goto('/');
		await waitForScene(page);
		expect(await stageMb(page)).toBeLessThanOrEqual(50);
	});
});

test('no leaf moves while idle with reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await waitForScene(page);
	await page.waitForTimeout(2000);
	const before = await page.screenshot();
	await page.waitForTimeout(4000);
	expect(await screenshotDiff(page, before, await page.screenshot())).toBe(0);
});

test('the scene appears all at once', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('[data-jungle-loader].opacity-0', { timeout: 30000 });
	const { drawn, leaves } = await page
		.locator('[data-jungle-stage]')
		.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
	expect(Number(drawn)).toBe(Number(leaves));
});

// Checks the file Netlify deploys: `vite preview` serves SvelteKit's own prerendered copy instead,
// which would hide a build step that overwrites it.
test('the deployed homepage is prerendered with the heading and the logo', () => {
	const html = readFileSync('build/index.html', 'utf8');
	expect(html).toContain('<title>Toma Nistor – San Diego Software Engineer</title>');
	expect(html).toContain(
		'Toma Nistor is a San Diego software engineer building fast, thoughtfully crafted websites and web apps.'
	);
	expect(html.match(/<h1/g)).toHaveLength(1);
	expect(html).toMatch(/<span data-title-name[^>]*>Toma Nistor<\/span>/);
	expect(html).toMatch(/<span data-title-subtitle[^>]*>San Diego Software Engineer<\/span>/);
	expect(html).toContain('<noscript>');
});

const NAME = '[data-title-name]';
const SUBTITLE = '[data-title-subtitle]';
const textWidth = (page: import('@playwright/test').Page, selector: string) =>
	page.locator(selector).evaluate((el) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		return range.getBoundingClientRect().width;
	});
// The scroll settles by screenshot, which lets a slow glide of the title through at large sizes.
async function waitForTitleToRest(page: import('@playwright/test').Page) {
	let previous = -1;
	await expect
		.poll(
			async () => {
				const { subtitle } = await lines(page);
				const moved = Math.abs(subtitle.bottom - previous) > 0.05;
				previous = subtitle.bottom;
				return moved;
			},
			{ intervals: [500], timeout: 30000 }
		)
		.toBe(false);
}

type Line = { top: number; bottom: number; left: number; right: number; opacity: number };
const lines = (page: import('@playwright/test').Page) =>
	page.evaluate(
		([name, subtitle]) => {
			const box = (selector: string) => {
				const el = document.querySelector(selector)!;
				const { top, bottom, left, right } = el.getBoundingClientRect();
				return { top, bottom, left, right, opacity: Number(getComputedStyle(el).opacity) };
			};
			return {
				name: box(name),
				subtitle: box(subtitle),
				heading: document.querySelector('[data-title]')!.getBoundingClientRect().top
			};
		},
		[NAME, SUBTITLE]
	) as Promise<{ name: Line; subtitle: Line; heading: number }>;

for (const [width, height] of [
	[1440, 900],
	[3440, 1440],
	[1280, 600],
	[390, 844]
]) {
	test(`sets the name as wide as the logo, with the subtitle under it at ${width}×${height}`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		await scrollTo(page, 1);
		await waitForTitleToRest(page);
		const { name, subtitle } = await lines(page);
		const nameWidth = await textWidth(page, NAME);
		const subtitleWidth = await textWidth(page, SUBTITLE);
		const logoWidth = logoSize({ width, height }, LOGO_REST_SCALE).w;
		expect(Math.abs(nameWidth / logoWidth - 1)).toBeLessThanOrEqual(0.06);
		if (width >= 1280) expect(Math.abs(subtitleWidth / nameWidth - 1)).toBeLessThanOrEqual(0.06);
		else
			expect(
				await page.locator(SUBTITLE).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
			).toBeGreaterThanOrEqual(12);
		for (const line of [name, subtitle]) {
			expect(line.top).toBeGreaterThanOrEqual(0);
			expect(line.bottom).toBeLessThanOrEqual(height);
			expect(Math.abs((line.left + line.right) / 2 - width / 2)).toBeLessThanOrEqual(2);
		}
		expect(subtitle.top).toBeGreaterThanOrEqual(name.bottom - 1);
		expect(subtitle.bottom).toBeLessThanOrEqual(0.72 * height);
	});
}

test('fades the name in before the subtitle', async ({ page }) => {
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 0.7);
	let { name, subtitle } = await lines(page);
	expect(name.opacity).toBeGreaterThan(0);
	expect(subtitle.opacity).toBe(0);
	await scrollTo(page, 0.75);
	({ name, subtitle } = await lines(page));
	expect(name.opacity).toBeGreaterThan(subtitle.opacity);
});

test('keeps the name below the logo while both move', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	// The title's dark text would count as logo pixels.
	await page.addStyleTag({ content: '[data-title] { visibility: hidden }' });
	for (const fraction of [0.6, 0.75, 0.9]) {
		await scrollTo(page, fraction);
		const { top } = (await lines(page)).name;
		expect(top, `at ${fraction * 100}%`).toBeGreaterThanOrEqual(await lastLogoRowAbove(page, 900));
	}
});

test('fades each line in with reduced motion', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	const end = await lines(page);
	await scrollTo(page, 0.75);
	const mid = await lines(page);
	// No rise: each line sits at the same offset from the heading's top as at the end.
	for (const line of ['name', 'subtitle'] as const) {
		const drift = mid[line].top - mid.heading - (end[line].top - end.heading);
		expect(Math.abs(drift), line).toBeLessThanOrEqual(1);
	}
	expect(mid.name.opacity).toBeGreaterThan(0);
	expect(mid.name.opacity).toBeLessThan(1);
	expect(end.name.opacity).toBe(1);
	expect(end.subtitle.opacity).toBe(1);
});

test('loads no font from Google', async ({ page }) => {
	const hosts: string[] = [];
	page.on('request', (request) => hosts.push(new URL(request.url()).hostname));
	await page.goto('/');
	await waitForScene(page);
	expect(hosts.filter((host) => /fonts\.(googleapis|gstatic)\.com/.test(host))).toEqual([]);
	const loaded = await page.evaluate(() =>
		[...document.fonts]
			.filter((face) => face.family.replace(/"/g, '') === 'Inter Tight' && face.status === 'loaded')
			.map((face) => face.weight)
			.sort()
	);
	expect(loaded).toEqual(['600', '900']);
});

test('the page does not bounce when scrolled past its ends', async ({ page }) => {
	await page.goto('/');
	const overscroll = await page.evaluate(() =>
		[document.documentElement, document.body].map((el) => getComputedStyle(el).overscrollBehaviorY)
	);
	expect(overscroll).toEqual(['none', 'none']);
});

test('leaves a wide clearing around the logo at the end of the reveal', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 0.5);
	expect(await openShare(page)).toBeGreaterThanOrEqual(0.394);
});

for (const [width, height] of [
	[1440, 900],
	[390, 844]
]) {
	test(`opens as one arch, never a figure 8 at ${width}×${height}`, async ({ page }) => {
		test.setTimeout(300000);
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		// The title's dark text would count as logo pixels.
		await page.addStyleTag({ content: '[data-title] { visibility: hidden }' });
		for (const fraction of [0.6, 0.75, 0.9, 1]) {
			await scrollTo(page, fraction);
			expect(await openRuns(page), `at ${fraction * 100}%`).toBe(1);
		}
	});
}

test('starts open when reloaded at the end', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	await page.reload();
	await waitForScene(page);
	expect(await regionShare(page, BOTTOM_MIDDLE, 'pure')).toBe(1);
});

test('keeps the bottom middle pure white with the cursor at the bottom', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	// Leaves shift against the cursor, so a cursor at the bottom pulls exited leaves back up.
	await page.mouse.move(720, 899, { steps: 10 });
	await page.waitForTimeout(3000);
	expect(await regionShare(page, BOTTOM_MIDDLE, 'pure')).toBe(1);
});

test('stays open across a resize', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	const stage = page.locator('[data-jungle-stage]');
	const before = Number(await stage.getAttribute('data-generation'));
	await page.setViewportSize({ width: 1280, height: 800 });
	await expect
		.poll(async () => Number(await stage.getAttribute('data-generation')))
		.toBeGreaterThan(before);
	expect(await regionShare(page, BOTTOM_MIDDLE, 'pure')).toBe(1);
});

for (const losses of [1, 2]) {
	test(`redraws the same scene after ${losses} GPU context loss(es)`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/');
		await waitForScene(page);
		await scrollTo(page, 0.5);
		// The leaves are still gliding into place for a few seconds after the scroll.
		await page.waitForTimeout(4000);
		const before = await page.screenshot();
		const stage = page.locator('[data-jungle-stage]');
		for (let i = 0; i < losses; i++) {
			const generation = Number(await stage.getAttribute('data-generation'));
			await page
				.locator('[data-jungle-stage] canvas')
				.evaluate((canvas: HTMLCanvasElement) =>
					canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
				);
			await expect(stage).toHaveAttribute('data-generation', String(generation + 1));
			await expect(stage).toHaveAttribute('data-renderer', 'webgl');
		}
		await page.waitForTimeout(1000);
		expect(await screenshotDiff(page, before, await page.screenshot())).toBeLessThanOrEqual(0.01);
	});
}
