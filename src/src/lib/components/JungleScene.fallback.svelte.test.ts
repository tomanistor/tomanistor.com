import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JungleScene from './JungleScene.svelte';

// Kept apart from the other scene tests: PixiJS caches whether WebGL works, and a renderer that
// fails partway through starting stays registered with PixiJS's global ticker for the whole file.
async function renderReady() {
	let resolveReady!: () => void;
	const ready = new Promise<void>((r) => (resolveReady = r));
	const screen = render(JungleScene, { onready: resolveReady });
	await ready;
	return screen.container.querySelector<HTMLElement>('[data-jungle-stage]')!;
}

function expectReadableTitle(stage: HTMLElement) {
	const title = stage.querySelector<HTMLElement>('[data-title]')!;
	const rect = title.getBoundingClientRect();
	const logo = stage
		.querySelector<HTMLImageElement>('[data-fallback-logo]')!
		.getBoundingClientRect();
	expect(rect.top).toBeGreaterThanOrEqual(logo.bottom);
	expect(rect.top).toBeGreaterThanOrEqual(0);
	expect(rect.bottom).toBeLessThanOrEqual(innerHeight);
	expect(getComputedStyle(title).opacity).toBe('1');
}

describe('JungleScene fallback', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Runs first, while WebGL still works, so the failure comes from preparing the leaves.
	it('shows the fallback logo when preparing the leaves fails', async () => {
		vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(() => {
			throw new Error('broken');
		});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const stage = await renderReady();
		expect(error).toHaveBeenCalledWith(
			'Jungle scene failed to start',
			expect.objectContaining({ message: 'broken' })
		);
		expect(stage.dataset.renderer).toBe('fallback');
		expect(stage.querySelector<HTMLImageElement>('[data-fallback-logo]')!.hidden).toBe(false);
		expect(stage.querySelector('canvas')).toBeNull();
		expectReadableTitle(stage);
	});

	it('shows the fallback logo when WebGL is unavailable', async () => {
		const getContext = HTMLCanvasElement.prototype.getContext;
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
			this: HTMLCanvasElement,
			...args: unknown[]
		) {
			return args[0] === 'webgl' || args[0] === 'webgl2'
				? null
				: Reflect.apply(getContext, this, args);
		} as typeof getContext);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const stage = await renderReady();
		expect(stage.dataset.renderer).toBe('fallback');
		expect(stage.querySelector<HTMLImageElement>('[data-fallback-logo]')!.hidden).toBe(false);
		expectReadableTitle(stage);
	});
});
