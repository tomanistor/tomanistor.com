import { describe, expect, it } from 'vitest';
import { camAt, logoPose, logoWidth, openAt, revealAt } from './phases';

describe('phases', () => {
	it('finishes the reveal at the split', () => {
		expect(revealAt(0.25)).toBeCloseTo(0.5);
		expect(camAt(0.25)).toBeCloseTo(0.5);
		expect(camAt(0.5)).toBe(1);
		expect(camAt(1)).toBe(1);
	});

	it('starts opening at the split and finishes at the end', () => {
		expect(openAt(0.5)).toBe(0);
		expect(openAt(0.75)).toBeCloseTo(0.5);
		expect(openAt(1)).toBe(1);
	});
});

describe('logoPose', () => {
	const v = { width: 1440, height: 900 };

	it('is the phase-1 logo, centred, when the camera is in and nothing has opened', () => {
		const { scale, dy } = logoPose(1, 0, v);
		expect(scale).toBe(1);
		expect(dy).toBeCloseTo(0);
	});

	it('shrinks to two thirds and rises once opened', () => {
		const { scale, dy } = logoPose(1, 1, v);
		expect(scale).toBeCloseTo(2 / 3);
		expect(dy).toBeCloseTo(-54);
	});
});

describe('logoWidth', () => {
	it('is limited by the viewport height on a wide screen', () => {
		expect(logoWidth({ width: 3440, height: 1440 })).toBeCloseTo(820.8);
	});
});
