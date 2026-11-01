import { page } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JungleScene from './JungleScene.svelte';
import { camAt, logoPose, logoWidth, openAt } from '$lib/jungle/phases';

// Kept apart from the other scene tests: PixiJS caches whether WebGL works, and a renderer that
// fails partway through starting stays registered with PixiJS's global ticker for the whole file.
async function renderReady() {
	let resolveReady!: () => void;
	const ready = new Promise<void>((r) => (resolveReady = r));
	const screen = render(JungleScene, { onready: resolveReady });
	await ready;
	return screen.container.querySelector<HTMLElement>('[data-jungle-stage]')!;
}

const fallbackLogo = (stage: HTMLElement) =>
	stage.querySelector<HTMLImageElement>('[data-fallback-logo]')!;

// Matches the loader's logo, so the hand-off doesn't jump.
function expectLogoAtStart(stage: HTMLElement) {
	const v = { width: stage.clientWidth, height: stage.clientHeight };
	const { scale } = logoPose(camAt(0), openAt(0), v);
	expect(fallbackLogo(stage).getBoundingClientRect().width).toBeCloseTo(scale * logoWidth(v), 0);
}

async function scrollToEnd() {
	scrollTo(0, document.documentElement.scrollHeight);
	await new Promise((r) => setTimeout(r, 200));
}

function expectReadableTitle(stage: HTMLElement) {
	const logo = fallbackLogo(stage).getBoundingClientRect();
	for (const line of ['[data-title-name]', '[data-title-subtitle]']) {
		const el = stage.querySelector<HTMLElement>(line)!;
		const rect = el.getBoundingClientRect();
		expect(rect.top, line).toBeGreaterThanOrEqual(logo.bottom);
		expect(rect.bottom, line).toBeLessThanOrEqual(innerHeight);
		expect(getComputedStyle(el).opacity, line).toBe('1');
	}
}

describe('JungleScene fallback', () => {
	beforeEach(async () => {
		await page.viewport(1440, 900);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		scrollTo(0, 0);
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
		expect(fallbackLogo(stage).hidden).toBe(false);
		expect(stage.querySelector('canvas')).toBeNull();
		expectLogoAtStart(stage);
		await scrollToEnd();
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
		expect(fallbackLogo(stage).hidden).toBe(false);
		expectLogoAtStart(stage);
		await scrollToEnd();
		expectReadableTitle(stage);
		await page.viewport(800, 500);
		await new Promise((r) => setTimeout(r, 200));
		expectReadableTitle(stage);
	});
});
