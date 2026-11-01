import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
	logoPixelShare,
	openRuns,
	openShare,
	regionShare,
	screenshotDiff,
	scrollTo,
	waitForScene,
	whiteFractionInEdgeBand
} from './measure';
import { LOGO_REST_SCALE, camAt, logoPose, logoSize, openAt } from '../src/lib/jungle/phases';

test.describe.configure({ timeout: 60000 });

const stageMb = (page: Page) =>
	page.locator('[data-jungle-stage]').evaluate((el) => Number((el as HTMLElement).dataset.gpuMb));

const BOTTOM_MIDDLE = { x0: 0.3, y0: 0.8, x1: 0.7, y1: 1 };

const NAME = '[data-title-name]';
const SUBTITLE = '[data-title-subtitle]';
const textWidth = (page: Page, selector: string) =>
	page.locator(selector).evaluate((el) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		return range.getBoundingClientRect().width;
	});
type Line = { top: number; bottom: number; left: number; right: number; opacity: number };
const lines = (page: Page) =>
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

const SOCIAL = '[data-social]';
const socialIcons = (page: Page) =>
	page.locator(`${SOCIAL} svg`).evaluateAll((icons) =>
		icons.map((icon) => {
			const { top, bottom, left, right } = icon.getBoundingClientRect();
			return { top, bottom, left, right };
		})
	);
const socialOpacity = (page: Page) =>
	page.locator(`${SOCIAL} a`).evaluateAll((links) => links.map((a) => getComputedStyle(a).opacity));
const socialTop = (page: Page) =>
	page.locator(SOCIAL).evaluate((el) => el.getBoundingClientRect().top);

async function expectSocialLaidOut(page: Page, width: number, height: number) {
	const icons = await socialIcons(page);
	expect.soft(icons, 'two icons').toHaveLength(2);
	for (const icon of icons) {
		expect.soft(icon.top, 'icon top').toBeGreaterThanOrEqual((await lines(page)).subtitle.bottom);
		expect.soft(icon.bottom, 'icon bottom').toBeLessThanOrEqual(height - 16);
		expect.soft(icon.left, 'icon left').toBeGreaterThanOrEqual(0);
		expect.soft(icon.right, 'icon right').toBeLessThanOrEqual(width);
	}
	const centre =
		(Math.min(...icons.map((i) => i.left)) + Math.max(...icons.map((i) => i.right))) / 2;
	expect.soft(Math.abs(centre - width / 2), 'icons centred').toBeLessThanOrEqual(2);
	expect.soft(await socialOpacity(page), 'icons in').toEqual(['1', '1']);
}

// The name stays below the logo, which is drawn where its pose says: the logo's centre columns are
// solid just above its bottom edge.
async function expectNameBelowLogo(page: Page, at: string) {
	const { scroll, width, height } = await page.evaluate(() => ({
		scroll: scrollY / (document.documentElement.scrollHeight - innerHeight),
		width: document.querySelector('[data-jungle-stage]')!.clientWidth,
		height: document.querySelector('[data-jungle-stage]')!.clientHeight
	}));
	const viewport = { width, height };
	const pose = logoPose(camAt(scroll), openAt(scroll), viewport);
	const logo = logoSize(viewport, pose.scale);
	const bottom = height / 2 + pose.dy + logo.h / 2;
	expect.soft((await lines(page)).name.top, `name below logo ${at}`).toBeGreaterThanOrEqual(bottom);
	const rows = { y0: (bottom - 6) / height, y1: (bottom - 2) / height };
	const span = { x0: 0.5 - (0.1 * logo.w) / width, x1: 0.5 + (0.1 * logo.w) / width };
	expect.soft(await regionShare(page, { ...span, ...rows }, 'logo'), `logo edge ${at}`).toBe(1);
}

async function expectTitleLaidOut(page: Page, width: number, height: number) {
	const { name, subtitle } = await lines(page);
	const nameWidth = await textWidth(page, NAME);
	const subtitleWidth = await textWidth(page, SUBTITLE);
	const logoWidth = logoSize({ width, height }, LOGO_REST_SCALE).w;
	expect
		.soft(Math.abs(nameWidth / logoWidth - 1), 'name as wide as the logo')
		.toBeLessThanOrEqual(0.06);
	if (width >= 1280)
		expect
			.soft(Math.abs(subtitleWidth / nameWidth - 1), 'subtitle as wide as the name')
			.toBeLessThanOrEqual(0.06);
	else
		expect
			.soft(
				await page.locator(SUBTITLE).evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
				'subtitle size floor'
			)
			.toBeGreaterThanOrEqual(12);
	for (const [label, line] of [
		['name', name],
		['subtitle', subtitle]
	] as const) {
		expect.soft(line.top, `${label} top`).toBeGreaterThanOrEqual(0);
		expect.soft(line.bottom, `${label} bottom`).toBeLessThanOrEqual(height);
		expect
			.soft(Math.abs((line.left + line.right) / 2 - width / 2), `${label} centred`)
			.toBeLessThanOrEqual(2);
	}
	expect.soft(subtitle.top, 'subtitle under the name').toBeGreaterThanOrEqual(name.bottom - 1);
	expect.soft(subtitle.bottom, 'title kept low').toBeLessThanOrEqual(0.79 * height);
}

// One load per size, checked at a few scroll positions with reduced motion. Edge coverage only
// needs the phase-1 ends and midpoint: everything that could expose an edge moves one way with
// scroll. The 1440×900 load also carries the checks that need only one size.
for (const { width, height, archAt } of [
	{ width: 1440, height: 900, archAt: [0.6, 0.75, 0.9] },
	{ width: 3440, height: 1440, archAt: [] },
	{ width: 1280, height: 600, archAt: [] },
	{ width: 390, height: 844, archAt: [0.6, 0.75, 0.9] }
]) {
	test(`frames the page through both phases at ${width}×${height}`, async ({ page }) => {
		test.setTimeout(150000);
		const main = width === 1440;
		const hosts: string[] = [];
		page.on('request', (request) => hosts.push(new URL(request.url()).hostname));
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await waitForScene(page);
		// The title's and footer's dark marks would count as logo pixels; their boxes and styles still measure.
		await page.addStyleTag({ content: '[data-title], [data-social] { visibility: hidden }' });

		const logo: number[] = [];
		for (const fraction of [0, 0.25, 0.5]) {
			await scrollTo(page, fraction);
			const at = `at ${fraction * 100}%`;
			expect.soft(await whiteFractionInEdgeBand(page), `edges ${at}`).toBeLessThanOrEqual(0.0005);
			if (main && fraction !== 0.25) logo.push(await logoPixelShare(page));
			if (fraction === 0)
				expect.soft(await socialOpacity(page), `footer hidden ${at}`).toEqual(['0', '0']);
		}
		if (main) expect.soft(await openShare(page), 'wide clearing').toBeGreaterThanOrEqual(0.394);

		let mid: Awaited<ReturnType<typeof lines>> | undefined;
		let midSocialTop = 0;
		for (const fraction of [...new Set([...archAt, 0.75, 1])]) {
			await scrollTo(page, fraction);
			const at = `at ${fraction * 100}%`;
			// Once the arch opens, the bottom edge is open on purpose.
			expect
				.soft(await whiteFractionInEdgeBand(page, 0.1, ['top', 'left', 'right']), `edges ${at}`)
				.toBeLessThanOrEqual(0.0005);
			if (archAt.length) expect.soft(await openRuns(page), `one arch ${at}`).toBe(1);
			if (archAt.includes(fraction)) await expectNameBelowLogo(page, at);
			if (main && fraction === 0.75) {
				mid = await lines(page);
				midSocialTop = await socialTop(page);
			}
		}

		expect.soft(await regionShare(page, BOTTOM_MIDDLE, 'pure'), 'bottom middle').toBe(1);
		for (const rect of [
			{ x0: 0, y0: 0.85, x1: 0.1, y1: 1 },
			{ x0: 0.9, y0: 0.85, x1: 1, y1: 1 }
		]) {
			expect
				.soft(await regionShare(page, rect, 'leaf'), `corner ${JSON.stringify(rect)}`)
				.toBeGreaterThanOrEqual(0.5);
		}
		await expectTitleLaidOut(page, width, height);
		await expectSocialLaidOut(page, width, height);
		if (!main) return;

		// Keyboard focus reveals a hidden footer link without scrolling the stage or the page.
		const shown = await page.addStyleTag({ content: '[data-social] { visibility: visible }' });
		await scrollTo(page, 0);
		const scrollBefore = await page.evaluate(() => scrollY);
		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		for (const link of await page.locator(`${SOCIAL} a`).all()) {
			for (
				let tabs = 0;
				tabs < 10 && !(await link.evaluate((a) => a === document.activeElement));
				tabs++
			)
				await page.keyboard.press('Tab');
			await expect(link).toBeFocused();
			expect.soft(await page.evaluate(() => scrollY), 'window scroll on focus').toBe(scrollBefore);
			expect
				.soft(
					await page.locator('[data-jungle-stage]').evaluate((el) => el.scrollTop),
					'stage scroll on focus'
				)
				.toBe(0);
			expect
				.soft(await link.evaluate((a) => getComputedStyle(a).opacity), 'focused link')
				.toBe('1');
		}
		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		await shown.evaluate((el) => el.remove());
		await scrollTo(page, 1);

		// Reduced motion fades each line in place, the name first.
		const end = await lines(page);
		for (const line of ['name', 'subtitle'] as const) {
			const drift = mid![line].top - mid!.heading - (end[line].top - end.heading);
			expect.soft(Math.abs(drift), `${line} drift`).toBeLessThanOrEqual(1);
		}
		expect
			.soft(Math.abs(midSocialTop - (await socialTop(page))), 'footer drift')
			.toBeLessThanOrEqual(1);
		expect.soft(mid!.name.opacity, 'name part way in').toBeGreaterThan(0);
		expect.soft(mid!.name.opacity, 'name part way in').toBeLessThan(1);
		expect.soft(mid!.subtitle.opacity, 'subtitle after the name').toBeLessThan(mid!.name.opacity);
		expect.soft(end.name.opacity, 'name in').toBe(1);
		expect.soft(end.subtitle.opacity, 'subtitle in').toBe(1);
		logo.push(await logoPixelShare(page));

		expect
			.soft(
				hosts.filter((host) => /fonts\.(googleapis|gstatic)\.com/.test(host)),
				'Google fonts'
			)
			.toEqual([]);
		expect
			.soft(
				await page.evaluate(() =>
					[document.documentElement, document.body].map(
						(el) => getComputedStyle(el).overscrollBehaviorY
					)
				),
				'overscroll'
			)
			.toEqual(['none', 'none']);

		// Last, as it hides the scene: the fully revealed logo with the leaves hidden.
		await page.addStyleTag({
			content: `canvas, [data-vignette] { visibility: hidden !important }
				[data-fallback-logo] { transform: none !important }`
		});
		await page.locator('[data-fallback-logo]').evaluate((el) => el.removeAttribute('hidden'));
		await page.waitForTimeout(100);
		const full = await logoPixelShare(page);
		const [start, revealed, rest] = logo.map((share) => share / full);
		expect.soft(start, 'logo hidden at the start').toBeGreaterThanOrEqual(0.15);
		expect.soft(start, 'logo hidden at the start').toBeLessThanOrEqual(0.25);
		expect.soft(revealed, 'logo revealed').toBeGreaterThan(0.98);
		// The logo rests at LOGO_REST_SCALE of its width, so its area shrinks by the square.
		expect.soft(rest, 'logo at rest').toBeGreaterThanOrEqual(0.98 * LOGO_REST_SCALE ** 2);
		expect.soft(rest, 'logo at rest').toBeLessThanOrEqual(1.02 * LOGO_REST_SCALE ** 2);
	});
}

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
	expect(html).toContain('href="https://github.com/tomanistor"');
	expect(html).toContain('href="https://linkedin.com/in/tomanistor"');
});

test('starts open when reloaded at the end, and stays open across a resize', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 1);
	await page.reload();
	await waitForScene(page);
	await page.addStyleTag({ content: '[data-social] { visibility: hidden }' });
	expect(await regionShare(page, BOTTOM_MIDDLE, 'pure'), 'after the reload').toBe(1);
	const stage = page.locator('[data-jungle-stage]');
	const before = Number(await stage.getAttribute('data-generation'));
	await page.setViewportSize({ width: 1280, height: 800 });
	await expect
		.poll(async () => Number(await stage.getAttribute('data-generation')))
		.toBeGreaterThan(before);
	await scrollTo(page, 1);
	expect(await regionShare(page, BOTTOM_MIDDLE, 'pure'), 'after the resize').toBe(1);
});

test('stays still while idle, and redraws the same scene after each GPU context loss', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	await scrollTo(page, 0.5);
	const before = await page.screenshot();
	await page.waitForTimeout(2000);
	expect(await screenshotDiff(page, before, await page.screenshot()), 'idle').toBe(0);
	const stage = page.locator('[data-jungle-stage]');
	for (const loss of [1, 2]) {
		const generation = Number(await stage.getAttribute('data-generation'));
		await page
			.locator('[data-jungle-stage] canvas')
			.evaluate((canvas: HTMLCanvasElement) =>
				canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
			);
		await expect(stage).toHaveAttribute('data-generation', String(generation + 1));
		await expect(stage).toHaveAttribute('data-renderer', 'webgl');
		await scrollTo(page, 0.5);
		expect(
			await screenshotDiff(page, before, await page.screenshot()),
			`after loss ${loss}`
		).toBeLessThanOrEqual(0.01);
	}
});
