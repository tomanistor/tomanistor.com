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

function generation(stage: HTMLElement): number {
	const value = Number(stage.dataset.generation);
	expect(value).toBeGreaterThanOrEqual(1);
	return value;
}

async function settledGeneration(stage: HTMLElement): Promise<number> {
	let seen = generation(stage);
	for (;;) {
		await new Promise((r) => setTimeout(r, 1000));
		if (generation(stage) === seen) return seen;
		seen = generation(stage);
	}
}

describe('JungleScene', () => {
	beforeEach(async () => {
		await page.viewport(1440, 900);
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('becomes ready and draws the live leaves', async () => {
		const { stage } = await renderReady();
		const count = Number(stage.dataset.leaves);
		expect(count).toBeGreaterThan(100);
		expect(Number(stage.dataset.drawn)).toBe(count);
		expect(Number(stage.dataset.gpuMb)).toBeGreaterThan(0);
		expect(stage.querySelectorAll('canvas')).toHaveLength(1);
	});

	it('still becomes ready when one image fails', async () => {
		const first = await renderReady();
		const all = Number(first.stage.dataset.leaves);
		first.screen.unmount();
		const decode = HTMLImageElement.prototype.decode;
		vi.spyOn(HTMLImageElement.prototype, 'decode').mockImplementation(function (
			this: HTMLImageElement
		) {
			return this.src.includes(fern) ? Promise.reject(new Error('broken')) : decode.call(this);
		});
		const { stage } = await renderReady();
		expect(Number(stage.dataset.leaves)).toBeGreaterThan(0);
		expect(Number(stage.dataset.leaves)).toBeLessThan(all);
	});

	it('recovers when the context is lost before the first frame', async () => {
		const observer = new MutationObserver((records) => {
			for (const node of records.flatMap((r) => [...r.addedNodes])) {
				if (!(node instanceof HTMLCanvasElement)) continue;
				observer.disconnect();
				node.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		const { stage } = await renderReady();
		await vi.waitFor(() => expect(stage.dataset.generation).toBe('2'), { timeout: 5000 });
		await vi.waitFor(() => expect(stage.dataset.renderer).toBe('webgl'), { timeout: 5000 });
		expect(stage.querySelectorAll('canvas')).toHaveLength(1);
	});

	it('darkens the edges with two vignettes above the canvas', async () => {
		const { stage } = await renderReady();
		const canvas = getComputedStyle(stage.querySelector('canvas')!);
		const vignettes = [...stage.querySelectorAll('[data-vignette]')].map((el) =>
			getComputedStyle(el)
		);
		expect(vignettes).toHaveLength(2);
		for (const vignette of vignettes) {
			expect(Number(vignette.zIndex)).toBeGreaterThan(Number(canvas.zIndex));
			expect(vignette.pointerEvents).toBe('none');
			expect(vignette.backgroundImage).toContain('gradient');
		}
	});

	it('has one heading, with the page title, above the vignettes', async () => {
		const { screen, stage } = await renderReady();
		const headings = screen.container.querySelectorAll('h1');
		expect(headings).toHaveLength(1);
		expect(headings[0].textContent?.replace(/\s+/g, ' ').trim()).toBe(
			'Toma Nistor – San Diego Software Engineer'
		);
		expect(stage.contains(headings[0])).toBe(true);
		const name = headings[0].querySelector('[data-title-name]')!;
		const subtitle = headings[0].querySelector('[data-title-subtitle]')!;
		expect(name.textContent).toBe('Toma Nistor');
		expect(subtitle.textContent).toBe('San Diego Software Engineer');
		// offsetTop ignores the rise transform, which differs per line.
		expect((subtitle as HTMLElement).offsetTop).toBeGreaterThanOrEqual(
			(name as HTMLElement).offsetTop + (name as HTMLElement).offsetHeight
		);
		const z = (el: Element) => Number(getComputedStyle(el).zIndex);
		for (const vignette of stage.querySelectorAll('[data-vignette]'))
			expect(z(headings[0])).toBeGreaterThan(z(vignette));
	});

	it('ignores a resize event when the size has not changed', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		dispatchEvent(new Event('resize'));
		await new Promise((r) => setTimeout(r, 3000));
		expect(generation(stage)).toBe(before);
	});

	it('keeps leaf count across a resize', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		const count = stage.dataset.leaves;
		await page.viewport(1280, 800);
		await vi.waitFor(() => expect(generation(stage)).toBe(before + 1), { timeout: 5000 });
		expect(stage.dataset.leaves).toBe(count);
	});

	it('only the last of two quick resizes lands', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		await page.viewport(1280, 800);
		await page.viewport(1200, 760);
		expect(await settledGeneration(stage)).toBe(before + 1);
		const canvas = stage.querySelector('canvas')!;
		expect([canvas.clientWidth, canvas.clientHeight]).toEqual([1200, 760]);
	});

	it('rebuilds when the pixel ratio changes', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')!;
		Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
		try {
			dispatchEvent(new Event('resize'));
			await vi.waitFor(() => expect(generation(stage)).toBe(before + 1), { timeout: 5000 });
		} finally {
			Object.defineProperty(window, 'devicePixelRatio', original);
		}
	});

	it('stops the frame loop and removes the canvas on destroy', async () => {
		const { screen, stage } = await renderReady();
		const raf = vi.spyOn(window, 'requestAnimationFrame');
		screen.unmount();
		raf.mockClear();
		await new Promise((r) => setTimeout(r, 100));
		expect(raf).not.toHaveBeenCalled();
		expect(stage.querySelector('canvas')).toBeNull();
	});
});
