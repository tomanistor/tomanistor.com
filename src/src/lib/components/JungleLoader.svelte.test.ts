import { page } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JungleLoader from './JungleLoader.svelte';
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

	it('starts closed before any animation runs', () => {
		render(JungleLoader, { done: false });
		expect(windowAt(0).height).toBe(0);
	});

	it('opens a centre column, then spreads to the full logo', () => {
		render(JungleLoader, { done: false });
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
		const screen = render(JungleLoader, { done: false });
		await new Promise((r) => setTimeout(r, 3000));
		expect(loaderEl()).not.toBeNull();
		await screen.rerender({ done: true });
		await vi.waitFor(() => expect(loaderEl()).toBeNull(), { timeout: 2000 });
	});

	it('matches the scene logo at a restored scroll position', async () => {
		const spacer = document.createElement('div');
		spacer.dataset.spacer = '';
		spacer.style.height = '5000px';
		document.body.prepend(spacer);
		scrollTo(0, 2000);
		render(Page);
		const loaderLogo = loaderEl()!.querySelector('[data-logo-box]')!;
		const sceneLogo = document.querySelector('[data-jungle-stage] > img')!;
		await vi.waitFor(() => expect(sceneLogo.getAttribute('style')).toContain('calc'), {
			timeout: 10000
		});
		expect(loaderLogo.getBoundingClientRect().width).toBeCloseTo(
			sceneLogo.getBoundingClientRect().width,
			0
		);
	});
});
