import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JungleLoader from './JungleLoader.svelte';
import { camAt, logoPose, logoWidth, openAt } from '#lib/jungle/phases.ts';
import { scrollFraction } from '#lib/jungle/motion.ts';
import Page from '../../routes/+page.svelte';

const loaderEl = () => document.querySelector<HTMLElement>('[data-jungle-loader]');

// The revealed window: the logo box clipped by all four sliding edges.
function windowAt(ms: number) {
	const loader = loaderEl()!;
	for (const el of loader.querySelectorAll<HTMLElement>('[data-edge], [data-edge] > div')) {
		for (const a of el.getAnimations()) {
			a.pause();
			a.currentTime = ms;
		}
	}
	const rects = [
		loader.querySelector('[data-logo-box]')!,
		...loader.querySelectorAll('[data-edge]')
	].map((el) => el.getBoundingClientRect());
	const box = rects[0];
	return {
		box,
		width: Math.max(
			0,
			Math.min(...rects.map((r) => r.right)) - Math.max(...rects.map((r) => r.left))
		),
		height: Math.max(
			0,
			Math.min(...rects.map((r) => r.bottom)) - Math.max(...rects.map((r) => r.top))
		)
	};
}

describe('JungleLoader', () => {
	beforeEach(async () => {
		await page.viewport(1440, 900);
	});
	afterEach(() => {
		document.querySelectorAll('[data-spacer]').forEach((el) => el.remove());
		scrollTo(0, 0);
	});

	it('starts as a thin band, opens a centre column, then spreads to the full logo', async () => {
		await render(JungleLoader, { done: false });
		const band = windowAt(0);
		expect(band.height).toBeCloseTo(band.box.height * 0.04, 0);
		expect(band.width).toBeCloseTo(band.box.width * 0.2, 0);
		// The spread starts just before the column finishes opening, as in the approved mockup.
		const column = windowAt(1150);
		expect(column.width).toBeCloseTo(column.box.width * 0.2, 0);
		const opened = windowAt(1200);
		expect(opened.height).toBeCloseTo(opened.box.height, 0);
		const full = windowAt(2200);
		expect(full.width).toBeCloseTo(full.box.width, 0);
		expect(full.height).toBeCloseTo(full.box.height, 0);
	});

	it('stays until done, then fades and unmounts', async () => {
		const screen = await render(JungleLoader, { done: false });
		await new Promise((r) => setTimeout(r, 3000));
		expect(loaderEl()).not.toBeNull();
		await screen.rerender({ done: true });
		await vi.waitFor(() => expect(loaderEl()).toBeNull(), { timeout: 2000 });
	});

	it('keeps the logo sized to the scroll position while loading', async () => {
		await render(JungleLoader, { done: false });
		const spacer = document.createElement('div');
		spacer.dataset.spacer = '';
		spacer.style.height = '5000px';
		document.body.append(spacer);
		scrollTo(0, 2000);
		const f = scrollY / (document.documentElement.scrollHeight - innerHeight);
		const scale = logoPose(camAt(f), openAt(f), {
			width: innerWidth,
			height: innerHeight
		}).scale.toFixed(4);
		await vi.waitFor(() =>
			expect(loaderEl()!.querySelector<HTMLElement>('[data-logo-box]')!.style.transform).toContain(
				`scale(${scale})`
			)
		);
	});

	it('matches the scene logo at a restored scroll position in phase 2', async () => {
		const target = 0.9;
		const spacer = document.createElement('div');
		spacer.dataset.spacer = '';
		// Tall enough to scroll to the target before the scene's own 500lvh section is rendered.
		spacer.style.height = '50000px';
		document.body.prepend(spacer);
		scrollTo(0, target * (50000 + 5 * innerHeight - innerHeight));
		await render(Page);
		const loaderLogo = loaderEl()!.querySelector('[data-logo-box]')!;
		const stage = document.querySelector<HTMLElement>('[data-jungle-stage]')!;
		// The scene draws its logo into the canvas, at the pose for the current scroll.
		const s = scrollFraction(scrollY, document.documentElement.scrollHeight, innerHeight);
		expect(s).toBeCloseTo(target, 1);
		const sceneWidth =
			logoPose(camAt(s), openAt(s), { width: stage.clientWidth, height: stage.clientHeight })
				.scale * logoWidth({ width: stage.clientWidth, height: stage.clientHeight });
		expect(loaderLogo.getBoundingClientRect().width).toBeCloseTo(sceneWidth, 0);
	});
});
