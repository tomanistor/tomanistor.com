import { beforeAll, describe, expect, it } from 'vitest';
import {
	BAKE_RES,
	bakeAll,
	paintLayer,
	renderResolution,
	textureMegabytes,
	type Bitmap
} from './bake';
import { generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { SPRITES } from './sprites';

const VIEWPORT = { width: 1440, height: 900 };

let leaves: Leaf[];
let images: Map<string, HTMLImageElement>;
let bitmaps: Map<string, Bitmap>;

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
	layoutLeaves(leaves, VIEWPORT);
	bitmaps = bakeAll(leaves, images, 2);
});

describe('bakeAll', () => {
	it('bakes one bitmap per key', () => {
		expect(bitmaps.size).toBe(new Set(leaves.map((l) => l.key)).size);
	});

	it('shares bitmaps so live leaves need fewer than 60', () => {
		expect(new Set(leaves.filter((l) => !isFar(l)).map((l) => l.key)).size).toBeLessThan(60);
	});

	it('keeps all texture memory at dpr 2 under 110MB', () => {
		expect(textureMegabytes(bitmaps.values())).toBeLessThan(110);
	});

	it.each([
		['foreground', (l: Leaf) => l.foreground, BAKE_RES.fg],
		['far', (l: Leaf) => isFar(l), BAKE_RES.far]
	])('bakes %s bitmaps at their reduced resolution', (_, pick, res) => {
		for (const leaf of leaves.filter(pick)) {
			const b = bitmaps.get(leaf.key!)!;
			expect(b.canvas.width).toBeLessThanOrEqual(b.box[0] * res + 1);
		}
	});

	it('bakes soft and sharp mid bitmaps within their caps', () => {
		for (const leaf of leaves.filter((l) => !l.foreground && !isFar(l))) {
			const b = bitmaps.get(leaf.key!)!;
			expect(b.canvas.width).toBeLessThanOrEqual(
				b.box[0] * Math.max(BAKE_RES.soft, BAKE_RES.sharp) + 1
			);
		}
	});

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

describe('paintLayer', () => {
	it('paints far layers at 1.5x the viewport at their resolution', () => {
		const sharp = document.createElement('canvas');
		const soft = document.createElement('canvas');
		paintLayer(
			sharp,
			soft,
			leaves.filter((l) => l.role === 'deep'),
			bitmaps,
			VIEWPORT,
			0.75,
			0.35,
			1.2,
			3
		);
		expect(sharp.width).toBe(Math.round(1440 * 1.5 * 0.75));
		expect(soft.height).toBe(Math.round(900 * 1.5 * 0.35));
	});
});
