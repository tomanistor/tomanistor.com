import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { bakeAll, renderResolution, type Bitmap } from './bake';
import { generateLeaves, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { Stale } from './pace';
import { SPRITES } from './sprites';

let images: Map<string, HTMLImageElement>;
let leaves: Leaf[];
let bitmaps: Map<string, Bitmap>;
let yields = 0;

beforeAll(async () => {
	images = new Map(
		[...new Set(SPRITES.map((s) => s.src))].map((src) => {
			const img = new Image();
			img.src = src;
			return [src, img];
		})
	);
	await Promise.all([...images.values()].map((img) => img.decode()));
	leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, { width: 1440, height: 900 });
	const { scheduler } = globalThis as unknown as { scheduler: { yield(): Promise<void> } };
	const spy = vi.spyOn(scheduler, 'yield');
	bitmaps = await bakeAll(leaves, images, 2, 1);
	yields = spy.mock.calls.length;
	spy.mockRestore();
});

describe('bakeAll', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('gives every leaf a box and origin scaled from its shared bitmap', () => {
		for (const leaf of leaves) {
			const b = bitmaps.get(leaf.key!)!;
			const s = leaf.cssPerPx! / b.cssPerPx;
			expect(leaf.box![0]).toBeCloseTo(b.box[0] * s);
			expect(leaf.origin![1]).toBeCloseTo(b.origin[1] * s);
		}
	});

	it('lets the browser in while baking the full set', () => {
		expect(yields).toBeGreaterThan(0);
	});

	it('a stopped bake still exits as Stale when releasing its bitmaps throws', async () => {
		let stopped = false;
		const { set } = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')!;
		vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set').mockImplementation(function (
			this: HTMLCanvasElement,
			value: number
		) {
			if (stopped && value === 0) throw new Error('cleanup');
			set!.call(this, value);
		});
		let calls = 0;
		const pace = async () => {
			if (++calls < 3) return;
			stopped = true;
			throw new Stale();
		};
		await expect(bakeAll(leaves, images, 2, 1, pace)).rejects.toBeInstanceOf(Stale);
	});
});

describe('renderResolution', () => {
	it.each([
		[1440, 900, 2, 2],
		[2560, 1340, 2, 1.229],
		[3440, 1440, 2, 1.023],
		[390, 844, 3, 3],
		[7680, 4320, 1, 1]
	])('%ix%i at dpr %i is %f', (width, height, dpr, expected) => {
		expect(renderResolution({ width, height }, dpr)).toBeCloseTo(expected, 2);
	});
});
