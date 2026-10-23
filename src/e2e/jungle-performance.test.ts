import { expect, test } from '@playwright/test';
import { frameStats, waitForScene } from './measure';

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
