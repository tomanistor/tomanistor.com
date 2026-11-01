import type { Page } from '@playwright/test';

export async function waitForScene(page: Page): Promise<void> {
	await page.waitForSelector('[data-jungle-loader]', { state: 'detached', timeout: 30000 });
}

// Resolves once the scene has drawn the settled pose. The scene writes `data-settled` on the next
// frame after the scroll, so a scroll that moves nothing leaves it "true" throughout.
export async function scrollTo(page: Page, fraction: number): Promise<void> {
	await page.evaluate(async (f) => {
		const stage = document.querySelector<HTMLElement>('[data-jungle-stage]')!;
		const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
		window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f);
		await frame();
		for (const deadline = performance.now() + 10000; stage.dataset.settled !== 'true'; ) {
			if (performance.now() > deadline) throw new Error('the scene did not settle in 10s');
			await frame();
		}
		await frame();
	}, fraction);
}

export type Edge = 'top' | 'right' | 'bottom' | 'left';
type Rect = { x0: number; y0: number; x1: number; y1: number };
type PixelTest = 'white' | 'logo' | 'open' | 'pure' | 'leaf';
type Region =
	| { kind: 'all' }
	| { kind: 'edge-band'; band: number; edges: Edge[] }
	| { kind: 'rect'; rect: Rect };

// Runs a pixel test over the current viewport screenshot, inside the page, and returns the share of
// pixels in `region` that pass `test`.
async function pixelShare(page: Page, region: Region, test: PixelTest): Promise<number> {
	const png = (await page.screenshot({ scale: 'css' })).toString('base64');
	return page.evaluate(
		async ({ png, region, test }) => {
			const img = new Image();
			img.src = `data:image/png;base64,${png}`;
			await img.decode();
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0);
			const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const inside = (x: number, y: number) => {
				if (region.kind === 'all') return true;
				if (region.kind === 'rect') {
					const { x0, y0, x1, y1 } = region.rect;
					return x >= x0 * width && x < x1 * width && y >= y0 * height && y < y1 * height;
				}
				const near = (d: number, size: number) => d < (region.band * size) / 2;
				const edges = region.edges;
				return (
					(edges.includes('top') && near(y, height)) ||
					(edges.includes('bottom') && near(height - y, height)) ||
					(edges.includes('left') && near(x, width)) ||
					(edges.includes('right') && near(width - x, width))
				);
			};
			let hits = 0;
			let total = 0;
			for (let y = 0; y < height; y += 2) {
				for (let x = 0; x < width; x += 2) {
					if (!inside(x, y)) continue;
					const i = (y * width + x) * 4;
					const [red, green, blue] = [data[i], data[i + 1], data[i + 2]];
					const white = red > 232 && green > 232 && blue > 232;
					const logo =
						Math.abs(red - 33) <= 8 && Math.abs(green - 33) <= 8 && Math.abs(blue - 33) <= 8;
					const pass = {
						white,
						logo,
						open: white || logo,
						pure: red >= 250 && green >= 250 && blue >= 250,
						leaf: !(white || logo)
					}[test];
					total++;
					if (pass) hits++;
				}
			}
			return hits / total;
		},
		{ png, region, test }
	);
}

const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

export const whiteFractionInEdgeBand = (page: Page, band = 0.15, edges: Edge[] = ALL_EDGES) =>
	pixelShare(page, { kind: 'edge-band', band, edges }, 'white');

// `rect` is in fractions of the viewport.
export const regionShare = (
	page: Page,
	rect: Rect,
	test: 'white' | 'pure' | 'open' | 'leaf' | 'logo'
) => pixelShare(page, { kind: 'rect', rect }, test);

export const logoPixelShare = (page: Page) => pixelShare(page, { kind: 'all' }, 'logo');

export async function frameStats(
	page: Page
): Promise<{ medianMs: number; p95Ms: number; worstMs: number }> {
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
		return {
			medianMs: d[d.length >> 1],
			p95Ms: d[Math.floor(d.length * 0.95)],
			worstMs: d[d.length - 1]
		};
	});
}

// Share of sampled pixels that differ by more than 8 in any channel between two screenshots.
export async function screenshotDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
	return page.evaluate(
		async (pngs) => {
			const [first, second] = await Promise.all(
				pngs.map(async (png) => {
					const img = new Image();
					img.src = `data:image/png;base64,${png}`;
					await img.decode();
					const canvas = document.createElement('canvas');
					canvas.width = img.naturalWidth;
					canvas.height = img.naturalHeight;
					const ctx = canvas.getContext('2d')!;
					ctx.drawImage(img, 0, 0);
					return ctx.getImageData(0, 0, canvas.width, canvas.height);
				})
			);
			const { width, height } = first;
			let hits = 0;
			let total = 0;
			for (let y = 0; y < height; y += 2) {
				for (let x = 0; x < width; x += 2) {
					const i = (y * width + x) * 4;
					total++;
					if ([0, 1, 2].some((c) => Math.abs(first.data[i + c] - second.data[i + c]) > 8)) hits++;
				}
			}
			return hits / total;
		},
		[a.toString('base64'), b.toString('base64')]
	);
}

// Share of the screen that is open clearing: white page or the logo, not leaves.
export const openShare = (page: Page) => pixelShare(page, { kind: 'all' }, 'open');

// Number of separate runs of open rows down the centre strip (x 0.48..0.52). A row is open when at
// least half its sampled pixels are not foliage; rows are sampled every 2px.
export async function openRuns(page: Page): Promise<number> {
	const png = (await page.screenshot({ scale: 'css' })).toString('base64');
	return page.evaluate(async (png) => {
		const img = new Image();
		img.src = `data:image/png;base64,${png}`;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(img, 0, 0);
		const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
		let runs = 0;
		let wasOpen = false;
		for (let y = 0; y < height; y += 2) {
			let open = 0;
			let total = 0;
			for (let x = Math.ceil(width * 0.48); x < width * 0.52; x += 2) {
				const i = (y * width + x) * 4;
				const [red, green, blue] = [data[i], data[i + 1], data[i + 2]];
				// Open is light (white, or the vignette's faint tint over it, never below 200) or the
				// logo's and title's dark grey; foliage and the dim vignette over it are neither.
				const light = red > 200 && green > 200 && blue > 200;
				const dark =
					Math.abs(red - 33) <= 8 && Math.abs(green - 33) <= 8 && Math.abs(blue - 33) <= 8;
				total++;
				if (light || dark) open++;
			}
			const isOpen = open / total >= 0.5;
			if (isOpen && !wasOpen) runs++;
			wasOpen = isOpen;
		}
		return runs;
	}, png);
}
