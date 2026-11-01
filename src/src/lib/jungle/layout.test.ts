import { describe, expect, it } from 'vitest';
import { SHADOW_PAD } from './bake';
import { parallaxAt, zoomAt } from './camera';
import { generateLeaves, isFar, type Leaf } from './leaves';
import {
	archZone,
	blankZone,
	inArch,
	layoutLeaves,
	logoSafeZone,
	openingZone,
	type Viewport
} from './layout';

const VIEWPORTS: Viewport[] = [
	{ width: 1440, height: 900 },
	{ width: 390, height: 844 },
	{ width: 3440, height: 1440 }
];

const DEG = 180 / Math.PI;
const rotate = ([x, y]: [number, number], a: number): [number, number] => [
	x * Math.cos(a) - y * Math.sin(a),
	x * Math.sin(a) + y * Math.cos(a)
];

const BLADE = [
	[0, 0.3],
	[0.2, 0.42],
	[0.4, 0.46],
	[0.6, 0.42],
	[0.8, 0.3],
	[1, 0.05]
];

function laidOut(v: Viewport): Leaf[] {
	const leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, v);
	return leaves;
}

describe('archZone', () => {
	it('opens around the resting logo at 1440×900', () => {
		const a = archZone({ width: 1440, height: 900 });
		expect(Math.abs(a.half - 486)).toBeLessThanOrEqual(3);
		expect(Math.abs(a.cy - a.rTop - -321)).toBeLessThanOrEqual(5);
		expect(a.bottom).toBe(450);
	});

	it('keeps a strip of leaves on each side of a phone', () => {
		expect(archZone({ width: 390, height: 844 }).half).toBe(0.34 * 390);
	});

	it('stays narrow enough on an ultrawide', () => {
		expect(Math.abs(archZone({ width: 3440, height: 1440 }).half - 778)).toBeLessThanOrEqual(3);
	});
});

describe('inArch', () => {
	const a = { cy: 0, half: 100, rTop: 50, bottom: 200 };
	it('is the strip below the centre line and the half-ellipse above it, ending at the bottom', () => {
		expect(inArch(0, 150, a)).toBe(true);
		expect(inArch(99, 0, a)).toBe(true);
		expect(inArch(0, -49, a)).toBe(true);
		expect(inArch(0, -51, a)).toBe(false);
		expect(inArch(90, -40, a)).toBe(false);
		expect(inArch(101, 50, a)).toBe(false);
		expect(inArch(0, 200, a)).toBe(false);
	});
});

describe.each(VIEWPORTS)('layoutLeaves at $width×$height', (v) => {
	const vmin = Math.min(v.width, v.height);

	it('roots every stemmed plant off-screen at the start', () => {
		for (const leaf of laidOut(v).filter((l) => l.sprite.stemEnd)) {
			const z0 = zoomAt(leaf.dist, 0);
			const [x, y] = leaf.anchor!.map((c) => c * z0);
			expect(Math.abs(x) > v.width / 2 || Math.abs(y) > v.height / 2).toBe(true);
		}
	});

	it('clears the opening zone once fully parted', () => {
		const { safeW, safeH } = openingZone(v);
		const blade = [
			[0, 0.3],
			[0.2, 0.42],
			[0.4, 0.46],
			[0.6, 0.42],
			[0.8, 0.3],
			[1, 0.05]
		];
		for (const leaf of laidOut(v)) {
			const dir1 = rotate(leaf.dir0!, leaf.swing / DEG);
			const perp = [-dir1[1], dir1[0]];
			for (const [f, lat] of blade) {
				for (const side of [-1, 1]) {
					const x =
						leaf.anchor![0] +
						leaf.n![0] * leaf.pull! +
						dir1[0] * leaf.len! * f +
						perp[0] * leaf.len! * lat * side;
					const y =
						leaf.anchor![1] +
						leaf.n![1] * leaf.pull! +
						dir1[1] * leaf.len! * f +
						perp[1] * leaf.len! * lat * side;
					expect(Math.abs(x) < safeW && Math.abs(y) < safeH).toBe(false);
				}
			}
		}
	});

	it('clears the arch once open', () => {
		const arch = archZone(v);
		for (const leaf of laidOut(v)) {
			const dir1 = rotate(leaf.dir0!, leaf.swing / DEG);
			const perp = [-dir1[1], dir1[0]];
			const travel = isFar(leaf) ? leaf.pull! : leaf.pull! + leaf.exit!;
			const drop = isFar(leaf) ? leaf.exit! : 0;
			expect(leaf.exit).toBeGreaterThanOrEqual(0);
			for (const [f, lat] of BLADE) {
				for (const side of [-1, 1]) {
					const x =
						leaf.anchor![0] +
						leaf.n![0] * travel +
						dir1[0] * leaf.len! * f +
						perp[0] * leaf.len! * lat * side;
					const y =
						leaf.anchor![1] +
						leaf.n![1] * travel +
						drop +
						dir1[1] * leaf.len! * f +
						perp[1] * leaf.len! * lat * side;
					expect(inArch(x, y, arch)).toBe(false);
				}
			}
		}
	});

	it('keeps every baked leaf out of the bottom middle wherever the cursor is', () => {
		const step = Array.from({ length: 11 }, (_, i) => i / 10);
		for (const leaf of laidOut(v)) {
			const { base, tip, crop } = leaf.sprite;
			const dir1 = rotate(leaf.dir0!, leaf.swing / DEG);
			const perp = [-dir1[1], dir1[0]];
			const mid = [(tip[0] - base[0]) * leaf.flip, tip[1] - base[1]];
			const m2 = mid[0] ** 2 + mid[1] ** 2;
			const travel = isFar(leaf) ? leaf.pull! : leaf.pull! + leaf.exit!;
			const root = [
				leaf.anchor![0] + leaf.n![0] * travel,
				leaf.anchor![1] + leaf.n![1] * travel + (isFar(leaf) ? leaf.exit! : 0)
			];
			// The cursor shifts a leaf by up to this much on each axis.
			const [x0, y0, x1, y1] = blankZone(v, parallaxAt(leaf.dist, vmin));
			const pad = SHADOW_PAD * Math.max(crop[2], crop[3]);
			for (const fx of step) {
				for (const fy of step) {
					const q = [
						(-pad + fx * (crop[2] + 2 * pad) - base[0]) * leaf.flip,
						-pad + fy * (crop[3] + 2 * pad) - base[1]
					];
					const f = (q[0] * mid[0] + q[1] * mid[1]) / m2;
					const lat = (q[1] * mid[0] - q[0] * mid[1]) / m2;
					const x = root[0] + (dir1[0] * f + perp[0] * lat) * leaf.len!;
					const y = root[1] + (dir1[1] * f + perp[1] * lat) * leaf.len!;
					expect(x > x0 && x < x1 && y > y0 && y < y1).toBe(false);
				}
			}
		}
	});

	it("clears the logo across the leafy bush's full width", () => {
		// The bush is a wide cluster, about 2.2× the width of a single blade.
		const { safeW, safeH } = logoSafeZone(v);
		const blade = [
			[0, 0.3],
			[0.2, 0.42],
			[0.4, 0.46],
			[0.6, 0.42],
			[0.8, 0.3],
			[1, 0.05]
		];
		for (const leaf of laidOut(v).filter((l) => l.sprite.src.includes('leafy-bush'))) {
			const dir1 = rotate(leaf.dir0!, leaf.swing / DEG);
			const perp = [-dir1[1], dir1[0]];
			for (const [f, lat] of blade) {
				for (const side of [-1, 1]) {
					const reach = leaf.len! * lat * 2.2 * side;
					const x =
						leaf.anchor![0] + leaf.n![0] * leaf.pull! + dir1[0] * leaf.len! * f + perp[0] * reach;
					const y =
						leaf.anchor![1] + leaf.n![1] * leaf.pull! + dir1[1] * leaf.len! * f + perp[1] * reach;
					expect(Math.abs(x) < safeW && Math.abs(y) < safeH).toBe(false);
				}
			}
		}
	});

	it('caps inset leaf travel at 28% of vmin unless rooted at the edge', () => {
		for (const leaf of laidOut(v).filter((l) => l.role === 'core')) {
			const z0 = zoomAt(leaf.dist, 0);
			const [x, y] = leaf.anchor!.map((c) => c * z0);
			const atEdge = Math.max(Math.abs(x) / (v.width / 2), Math.abs(y) / (v.height / 2)) >= 0.97;
			expect(leaf.pull! <= vmin * 0.28 || atEdge).toBe(true);
		}
	});

	it('is stable across repeated layouts', () => {
		const leaves = generateLeaves(11, 1);
		layoutLeaves(leaves, v);
		const first = leaves.map((l) => [l.anchor, l.pull, l.rot0]);
		layoutLeaves(leaves, v);
		expect(leaves.map((l) => [l.anchor, l.pull, l.rot0])).toEqual(first);
	});

	it('draws nearer leaves larger than farther ones, all else equal', () => {
		const bySprite = new Map<string, Leaf[]>();
		for (const leaf of laidOut(v).filter((l) => !isFar(l))) {
			const key = JSON.stringify(leaf.sprite.crop) + leaf.sprite.src;
			bySprite.set(key, [...(bySprite.get(key) ?? []), leaf]);
		}
		for (const group of bySprite.values()) {
			const sorted = [...group].sort((a, b) => a.dist - b.dist);
			const size = sorted.map((l) => l.cssPerPx! / (l.sprite.size * l.scale));
			for (let i = 1; i < size.length; i++) {
				if (sorted[i].dist > sorted[i - 1].dist) expect(size[i]).toBeLessThan(size[i - 1]);
			}
		}
	});
});
