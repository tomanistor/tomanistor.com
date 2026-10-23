import { describe, expect, it } from 'vitest';
import { zoomAt } from './camera';
import { generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves, logoSafeZone, type Viewport } from './layout';

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

function laidOut(v: Viewport): Leaf[] {
	const leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, v);
	return leaves;
}

describe.each(VIEWPORTS)('layoutLeaves at $width×$height', (v) => {
	const vmin = Math.min(v.width, v.height);

	it('roots every stemmed plant off-screen at the start', () => {
		for (const leaf of laidOut(v).filter((l) => l.sprite.stemEnd)) {
			const z0 = zoomAt(leaf.dist, 0);
			const [x, y] = leaf.anchor!.map((c) => c * z0);
			expect(Math.abs(x) > v.width / 2 || Math.abs(y) > v.height / 2).toBe(true);
		}
	});

	it('clears the logo safe zone once fully parted', () => {
		const { safeW, safeH } = logoSafeZone(v);
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

	it('caps inset leaf travel at 8% of vmin unless rooted at the edge', () => {
		for (const leaf of laidOut(v).filter((l) => l.role === 'core')) {
			const z0 = zoomAt(leaf.dist, 0);
			const [x, y] = leaf.anchor!.map((c) => c * z0);
			const atEdge = Math.max(Math.abs(x) / (v.width / 2), Math.abs(y) / (v.height / 2)) >= 0.97;
			expect(leaf.pull! <= vmin * 0.08 || atEdge).toBe(true);
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
