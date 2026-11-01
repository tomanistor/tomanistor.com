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

// Resolves once the scene's next build has started and handed the main thread back.
async function rebuildInFlight(width: number, height: number) {
	const { scheduler } = globalThis as unknown as { scheduler: { yield(): Promise<void> } };
	const yields = vi.spyOn(scheduler, 'yield');
	await page.viewport(width, height);
	await vi.waitFor(() => expect(yields).toHaveBeenCalled(), { timeout: 5000, interval: 1 });
	yields.mockRestore();
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

	it('reports settled once at rest, and again after a scroll', async () => {
		const { stage } = await renderReady();
		await vi.waitFor(() => expect(stage.dataset.settled).toBe('true'), { timeout: 5000 });
		window.scrollTo(0, document.documentElement.scrollHeight);
		await vi.waitFor(() => expect(stage.dataset.settled).toBe('false'), { timeout: 5000 });
		await vi.waitFor(() => expect(stage.dataset.settled).toBe('true'), { timeout: 10000 });
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

	it('has one heading, with the page title in Inter Tight capitals, above the vignettes', async () => {
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
		// Loaded before the title is fitted to the logo.
		for (const [el, weight] of [
			[name, '900'],
			[subtitle, '600']
		] as const) {
			const style = getComputedStyle(el);
			expect(style.fontFamily).toMatch(/^"?Inter Tight/);
			expect(style.textTransform).toBe('uppercase');
			expect(style.fontWeight).toBe(weight);
			expect(document.fonts.check(`${weight} 16px "Inter Tight"`)).toBe(true);
			const faces = [...document.fonts].filter(
				(face) => face.family.replace(/"/g, '') === 'Inter Tight' && face.weight === weight
			);
			expect(faces.some((face) => face.status === 'loaded')).toBe(true);
		}
	});

	it('has a footer with the GitHub and LinkedIn links, above the vignettes', async () => {
		const { screen, stage } = await renderReady();
		const footers = screen.container.querySelectorAll('footer');
		expect(footers).toHaveLength(1);
		expect(stage.contains(footers[0])).toBe(true);
		const links = [...footers[0].querySelectorAll('a')];
		expect(links.map((a) => [a.getAttribute('href'), a.getAttribute('aria-label')])).toEqual([
			['https://github.com/tomanistor', 'GitHub'],
			['https://linkedin.com/in/tomanistor', 'LinkedIn']
		]);
		for (const a of links) {
			expect(a.hasAttribute('target')).toBe(false);
			expect(a.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
		}
		expect(footers[0].querySelectorAll('svg')).toHaveLength(2);
		for (const vignette of stage.querySelectorAll('[data-vignette]'))
			expect(Number(getComputedStyle(footers[0]).zIndex)).toBeGreaterThan(
				Number(getComputedStyle(vignette).zIndex)
			);
	});

	it('ignores a resize event when the size has not changed', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		dispatchEvent(new Event('resize'));
		await new Promise((r) => setTimeout(r, 3000));
		expect(generation(stage)).toBe(before);
	});

	it('only the last of two quick resizes lands, keeping the leaf count', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		const count = stage.dataset.leaves;
		await page.viewport(1280, 800);
		await page.viewport(1200, 760);
		expect(await settledGeneration(stage)).toBe(before + 1);
		const canvas = stage.querySelector('canvas')!;
		expect([canvas.clientWidth, canvas.clientHeight]).toEqual([1200, 760]);
		expect(stage.dataset.leaves).toBe(count);
	});

	it('destroying during an in-flight rebuild leaves no canvas and logs no error', async () => {
		const { screen } = await renderReady();
		const errors = vi.spyOn(console, 'error');
		await rebuildInFlight(1280, 800);
		screen.unmount();
		const frames = vi.spyOn(window, 'requestAnimationFrame');
		await new Promise((r) => setTimeout(r, 1000));
		expect(screen.container.querySelector('canvas')).toBeNull();
		expect(document.querySelector('canvas')).toBeNull();
		expect(errors).not.toHaveBeenCalled();
		expect(frames).not.toHaveBeenCalled();
	});

	it('a second resize during an in-flight rebuild ends at the final size, one generation per landing', async () => {
		const { stage } = await renderReady();
		const before = generation(stage);
		const landed: string[] = [];
		const observer = new MutationObserver((records) => {
			for (const record of records) landed.push(record.oldValue!);
		});
		observer.observe(stage, {
			attributeFilter: ['data-generation'],
			attributeOldValue: true
		});
		await rebuildInFlight(1280, 800);
		await page.viewport(1200, 760);
		const after = await settledGeneration(stage);
		observer.disconnect();
		expect(landed.length).toBeGreaterThanOrEqual(1);
		expect(after).toBe(before + landed.length);
		expect(landed.map(Number)).toEqual(landed.map((_, i) => before + i));
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
});
