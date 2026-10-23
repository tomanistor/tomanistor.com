import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
	logoPixelShare,
	openShare,
	scrollTo,
	waitForScene,
	whiteFractionInEdgeBand
} from './measure';

test.describe.configure({ timeout: 180000 });

const stageMb = (page: import('@playwright/test').Page) =>
	page
		.locator('[data-jungle-stage]')
		.evaluate((el) => Number((el as HTMLElement).dataset.bitmapMb));

for (const [width, height] of [
	[1440, 900],
	[3440, 1440],
	[1280, 600],
	[390, 844]
]) {
	test(`edges are covered at every scroll position at ${width}×${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
			await scrollTo(page, fraction);
			expect(await whiteFractionInEdgeBand(page), `at ${fraction * 100}%`).toBeLessThanOrEqual(
				0.0005
			);
		}
	});
}

test('about 80% of the logo is hidden at the start and none at the end', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 0);
	const start = await logoPixelShare(page);
	await scrollTo(page, 1);
	const end = await logoPixelShare(page);
	// Compare against the fully revealed logo with the leaves hidden.
	await page.addStyleTag({
		content: 'img[data-key], canvas, [data-jungle-stage] > div { visibility: hidden !important }'
	});
	await page.waitForTimeout(100);
	const full = await logoPixelShare(page);
	expect(start / full).toBeGreaterThanOrEqual(0.15);
	expect(start / full).toBeLessThanOrEqual(0.25);
	expect(end / full).toBeGreaterThan(0.98);
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
	const transforms = () =>
		page
			.locator('img[data-key]')
			.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.transform));
	const before = await transforms();
	await page.waitForTimeout(4000);
	expect(await transforms()).toEqual(before);
});

test('the scene appears all at once', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('[data-jungle-loader].opacity-0', { timeout: 30000 });
	const { shown, expected } = await page.evaluate(() => ({
		shown: document.querySelectorAll('img[data-key]').length,
		expected: Number(document.querySelector<HTMLElement>('[data-jungle-stage]')!.dataset.leaves)
	}));
	expect(shown).toBe(expected);
});

// Checks the file Netlify deploys: `vite preview` serves SvelteKit's own prerendered copy instead,
// which would hide a build step that overwrites it.
test('the deployed homepage is prerendered with the heading and the logo', () => {
	const html = readFileSync('build/index.html', 'utf8');
	expect(html).toContain('Toma Nistor – San Diego Software Engineer</h1>');
	expect(html).toContain('<noscript>');
});

test('the page does not bounce when scrolled past its ends', async ({ page }) => {
	await page.goto('/');
	const overscroll = await page.evaluate(() =>
		[document.documentElement, document.body].map((el) => getComputedStyle(el).overscrollBehaviorY)
	);
	expect(overscroll).toEqual(['none', 'none']);
});

test('leaves a wide clearing around the logo at the end', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	expect(await openShare(page)).toBeGreaterThanOrEqual(0.28);
});
