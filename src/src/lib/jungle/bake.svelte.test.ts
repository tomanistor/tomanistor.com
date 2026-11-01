import { beforeAll, describe, expect, it } from 'vitest';
import { bakeAll, renderResolution, type Bitmap } from './bake';
import { generateLeaves, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { SPRITES } from './sprites';

let leaves: Leaf[];
let bitmaps: Map<string, Bitmap>;

beforeAll(async () => {
	const images = new Map(
		[...new Set(SPRITES.map((s) => s.src))].map((src) => {
			const img = new Image();
			img.src = src;
			return [src, img];
		})
	);
	await Promise.all([...images.values()].map((img) => img.decode()));
	leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, { width: 1440, height: 900 });
	bitmaps = bakeAll(leaves, images, 2);
});

describe('bakeAll', () => {
	it('gives every leaf a box and origin scaled from its shared bitmap', () => {
		for (const leaf of leaves) {
			const b = bitmaps.get(leaf.key!)!;
			const s = leaf.cssPerPx! / b.cssPerPx;
			expect(leaf.box![0]).toBeCloseTo(b.box[0] * s);
			expect(leaf.origin![1]).toBeCloseTo(b.origin[1] * s);
		}
	});
});

describe('renderResolution', () => {
	it.each([
		[1440, 900, 2, 2],
		[2560, 1340, 2, 1.556],
		[3440, 1440, 2, 1.295],
		[390, 844, 3, 3],
		[7680, 4320, 1, 1]
	])('%ix%i at dpr %i is %f', (width, height, dpr, expected) => {
		expect(renderResolution({ width, height }, dpr)).toBeCloseTo(expected, 2);
	});
});
