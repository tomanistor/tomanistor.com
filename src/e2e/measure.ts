import type { Page } from '@playwright/test';

export async function waitForScene(page: Page): Promise<void> {
	await page.waitForSelector('[data-jungle-loader]', { state: 'detached', timeout: 30000 });
}

export async function scrollTo(page: Page, fraction: number): Promise<void> {
	await page.evaluate(
		(f) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f),
		fraction
	);
	await page.waitForTimeout(3500);
}

// Runs a pixel test over the current viewport screenshot, inside the page, and returns the share of
// pixels in `region` that pass `test`.
async function pixelShare(
	page: Page,
	region: 'edge-band' | 'all',
	test: 'white' | 'logo',
	band = 0.15
): Promise<number> {
	const png = (await page.screenshot({ scale: 'css' })).toString('base64');
	return page.evaluate(
		async ({ png, region, test, band }) => {
			const img = new Image();
			img.src = `data:image/png;base64,${png}`;
			await img.decode();
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0);
			const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
			let hits = 0;
			let total = 0;
			for (let y = 0; y < height; y += 2) {
				for (let x = 0; x < width; x += 2) {
					const r = Math.max(
						Math.abs(x - width / 2) / (width / 2),
						Math.abs(y - height / 2) / (height / 2)
					);
					if (region === 'edge-band' && r <= 1 - band) continue;
					const i = (y * width + x) * 4;
					const [red, green, blue] = [data[i], data[i + 1], data[i + 2]];
					const pass =
						test === 'white'
							? red > 232 && green > 232 && blue > 232
							: Math.abs(red - 33) <= 8 && Math.abs(green - 33) <= 8 && Math.abs(blue - 33) <= 8;
					total++;
					if (pass) hits++;
				}
			}
			return hits / total;
		},
		{ png, region, test, band }
	);
}

export const whiteFractionInEdgeBand = (page: Page, band = 0.15) =>
	pixelShare(page, 'edge-band', 'white', band);

export const logoPixelShare = (page: Page) => pixelShare(page, 'all', 'logo');

export async function frameStats(page: Page): Promise<{ medianMs: number; worstMs: number }> {
	return page.evaluate(async () => {
		const times: number[] = [];
		let running = true;
		const tick = (t: number) => {
			times.push(t);
			if (running) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
		for (let i = 0; i < 10; i++) {
			window.scrollBy(0, 120);
			await new Promise((r) => setTimeout(r, 60));
		}
		await new Promise((r) => setTimeout(r, 1000));
		running = false;
		const d = times
			.slice(1)
			.map((t, i) => t - times[i])
			.sort((a, b) => a - b);
		return { medianMs: d[d.length >> 1], worstMs: d[d.length - 1] };
	});
}
