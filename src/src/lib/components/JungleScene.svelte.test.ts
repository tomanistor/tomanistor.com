import { page } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JungleScene from './JungleScene.svelte';
import fern from '$lib/assets/jungle/fern.webp';

async function renderReady() {
	let resolveReady!: () => void;
	const ready = new Promise<void>((r) => (resolveReady = r));
	const screen = render(JungleScene, { onready: resolveReady });
	await ready;
	const stage = screen.container.querySelector<HTMLElement>('[data-jungle-stage]')!;
	return { screen, stage };
}

const leafImages = (stage: HTMLElement) => [
	...stage.querySelectorAll<HTMLImageElement>('img[data-key]')
];

describe('JungleScene', () => {
	beforeEach(async () => {
		await page.viewport(1440, 900);
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('becomes ready and renders the live leaves', async () => {
		const { stage } = await renderReady();
		const count = Number(stage.dataset.leaves);
		expect(count).toBeGreaterThan(100);
		expect(leafImages(stage)).toHaveLength(count);
		expect(Number(stage.dataset.bitmapMb)).toBeGreaterThan(0);
	});

	it('still becomes ready when one image fails', async () => {
		const decode = HTMLImageElement.prototype.decode;
		vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(function (
			this: HTMLImageElement
		) {
			return this.src.includes(fern) ? Promise.reject(new Error('broken')) : decode.call(this);
		});
		const { stage } = await renderReady();
		expect(leafImages(stage).length).toBeGreaterThan(0);
		expect(leafImages(stage).every((img) => !img.dataset.key!.startsWith('12|'))).toBe(true);
	});

	it('still reports ready when preparing the leaves fails', async () => {
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
			callback(null);
		});
		const report = vi.spyOn(console, 'error').mockImplementation(() => {});
		await renderReady();
		expect(report).toHaveBeenCalledWith('Jungle scene failed to start', expect.any(Error));
	});

	it('uses the reference 3D perspective so leaf tilt is visible', async () => {
		const { stage } = await renderReady();
		expect(getComputedStyle(stage).perspective).toBe('1400px');
	});

	it('moves the logo and shade on their own layers so parallax never repaints them', async () => {
		const { stage } = await renderReady();
		const shade = stage.querySelector<HTMLElement>(':scope > div')!;
		const logo = stage.querySelector<HTMLElement>(':scope > img')!;
		expect(getComputedStyle(shade).willChange).toBe('transform');
		expect(getComputedStyle(logo).willChange).toBe('transform');
	});

	it('darkens the edges with a vignette above every leaf', async () => {
		const { stage } = await renderReady();
		const vignette = stage.querySelector<HTMLElement>('[data-vignette]')!;
		const style = getComputedStyle(vignette);
		const topLeaf = Math.max(...leafImages(stage).map((img) => Number(img.style.zIndex)));
		expect(Number(style.zIndex)).toBeGreaterThan(topLeaf);
		expect(style.pointerEvents).toBe('none');
		expect(style.backgroundImage).toContain('radial-gradient');
	});

	it('ignores a resize event when the size has not changed', async () => {
		await renderReady();
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		dispatchEvent(new Event('resize'));
		await new Promise((r) => setTimeout(r, 3000));
		expect(revoke).not.toHaveBeenCalled();
	});

	it('moves leaves to their new layout in the same frame as their new images', async () => {
		const { stage } = await renderReady();
		const imgs = leafImages(stage);
		const frames: { src: string[]; xy: number[][] }[] = [];
		let recording = true;
		const record = () => {
			frames.push({
				src: imgs.map((img) => img.src),
				xy: imgs.map((img) => {
					const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(img.style.transform)!;
					return [Number(m[1]), Number(m[2])];
				})
			});
			if (recording) requestAnimationFrame(record);
		};
		requestAnimationFrame(record);
		await page.viewport(1280, 800);
		await vi.waitFor(() => expect(imgs[0].src).not.toBe(frames[0].src[0]), { timeout: 5000 });
		await new Promise((r) => setTimeout(r, 300));
		recording = false;
		// Any frame where a leaf jumps must be the frame its image was swapped, never before.
		const swap = frames.findIndex((f) => f.src[0] !== frames[0].src[0]);
		for (let i = 1; i < swap; i++) {
			for (let j = 0; j < imgs.length; j++) {
				const [a, b] = [frames[i - 1].xy[j], frames[i].xy[j]];
				expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(10);
			}
		}
	});

	it('keeps leaf count and arrangement across a resize', async () => {
		const { stage } = await renderReady();
		const before = leafImages(stage).map((img) => img.dataset.key);
		const oldUrls = leafImages(stage).map((img) => img.src);
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		await page.viewport(1280, 800);
		await vi.waitFor(() => expect(revoke).toHaveBeenCalled(), { timeout: 5000 });
		await vi.waitFor(() => expect(leafImages(stage)[0].src).not.toBe(oldUrls[0]), {
			timeout: 5000
		});
		expect(leafImages(stage).map((img) => img.dataset.key)).toEqual(before);
		for (const url of new Set(oldUrls)) expect(revoke).toHaveBeenCalledWith(url);
	});

	it('removes leaves and stops the frame loop on destroy', async () => {
		const { screen, stage } = await renderReady();
		const raf = vi.spyOn(window, 'requestAnimationFrame');
		screen.unmount();
		raf.mockClear();
		await new Promise((r) => setTimeout(r, 100));
		expect(raf).not.toHaveBeenCalled();
		expect(leafImages(stage)).toHaveLength(0);
	});
});
