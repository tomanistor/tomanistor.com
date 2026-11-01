import { describe, expect, it } from 'vitest';
import { generateLeaves, densityFor, GROUPS } from './leaves';
import { mulberry32 } from './random';

describe('generateLeaves', () => {
	it('is deterministic for a seed', () => {
		expect(generateLeaves(11, 1)).toEqual(generateLeaves(11, 1));
	});
	it.each([1, 0.45])('scales counts by density %f with a floor of 2 per group', (density) => {
		const expected = GROUPS.reduce((s, g) => s + Math.max(2, Math.round(g.count * density)), 0);
		expect(generateLeaves(11, density)).toHaveLength(expected);
	});
	it('never gives a stemmed plant to a leaf set inside the scene', () => {
		for (const leaf of generateLeaves(11, 1)) {
			if (leaf.role === 'core' || leaf.role === 'deep') expect(leaf.sprite.stemEnd).toBeUndefined();
		}
	});
	it('uses only high-resolution plants for the foreground', () => {
		for (const leaf of generateLeaves(11, 1).filter((l) => l.role === 'foreground')) {
			expect(leaf.sprite.hi).toBe(true);
		}
	});
	it('sorts back to front', () => {
		const d = generateLeaves(11, 1).map((l) => l.dist);
		expect(d).toEqual([...d].sort((a, b) => b - a));
	});
});

describe('densityFor', () => {
	it('clamps to 0.45–1', () => {
		expect(densityFor(1440, 900)).toBe(1);
		expect(densityFor(390, 844)).toBeCloseTo(0.45);
		expect(densityFor(3440, 1440)).toBe(1);
	});
});

describe('mulberry32', () => {
	it('matches the reference sequence', () => {
		const r = mulberry32(11);
		expect([r(), r(), r()].map((v) => v.toFixed(6))).toMatchSnapshot();
	});
});
