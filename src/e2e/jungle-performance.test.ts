import { expect, test, type Page } from '@playwright/test';
import { frameStats, logoPixelShare, scrollTo, waitForScene } from './measure';
import { LOGO_DIST, zoomAt } from '../src/lib/jungle/camera';
import { camAt } from '../src/lib/jungle/phases';

// The default test browser renders in software (SwiftShader), which runs even the approved mockup at
// ~9fps; frame rate is only meaningful with the machine's GPU.
test.use({
	deviceScaleFactor: 2,
	viewport: { width: 1440, height: 900 },
	channel: 'chromium',
	launchOptions: {
		args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
	}
});

const LARGE = [
	{ width: 2560, height: 1340, mb: 250 },
	{ width: 3440, height: 1440, mb: 300 }
];

async function load(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await page.goto('/');
	await waitForScene(page);
}

test('holds 60fps on a slow CPU at 2x pixel density', async ({ page }) => {
	test.setTimeout(120000);
	await page.goto('/');
	await waitForScene(page);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
	const { medianMs, worstMs } = await frameStats(page);
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
	expect(medianMs).toBeLessThanOrEqual(17.5);
	expect(worstMs).toBeLessThanOrEqual(20);
});

test('holds 60fps on large screens', async ({ page }) => {
	test.setTimeout(120000);
	for (const { width, height } of LARGE) {
		await load(page, width, height);
		const { medianMs, p95Ms } = await frameStats(page);
		expect.soft(medianMs, `median at ${width}×${height}`).toBeLessThanOrEqual(17.5);
		expect.soft(p95Ms, `p95 at ${width}×${height}`).toBeLessThanOrEqual(20);
	}
});

test('keeps graphics memory within target at 2560×1340 and 3440×1440', async ({ page }) => {
	test.setTimeout(120000);
	for (const { width, height, mb } of LARGE) {
		await load(page, width, height);
		const used = await page
			.locator('[data-jungle-stage]')
			.evaluate((el) => Number((el as HTMLElement).dataset.gpuMb));
		expect.soft(used, `MB at ${width}×${height}`).toBeLessThanOrEqual(mb);
	}
});

test('keeps the logo visible on a large Retina screen', async ({ page }) => {
	test.setTimeout(120000);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await load(page, 2560, 1340);
	const shares: [number, number][] = [];
	for (const fraction of [0.4, 0.5]) {
		await scrollTo(page, fraction);
		shares.push([fraction, await logoPixelShare(page)]);
	}
	await page.addStyleTag({
		content: `canvas, [data-vignette] { visibility: hidden !important }
			[data-fallback-logo] { transform: none !important }`
	});
	await page.locator('[data-fallback-logo]').evaluate((el) => el.removeAttribute('hidden'));
	await page.waitForTimeout(100);
	const full = await logoPixelShare(page);
	// The camera is still closing in at 40%, so the logo is drawn smaller than in full.
	for (const [fraction, share] of shares)
		expect
			.soft(share / (full * zoomAt(LOGO_DIST, camAt(fraction)) ** 2), `logo at ${fraction * 100}%`)
			.toBeGreaterThan(0.98);
});
