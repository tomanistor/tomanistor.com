import { describe, expect, it } from 'vitest';
import {
	camAt,
	logoPose,
	logoSize,
	logoWidth,
	openAt,
	revealAt,
	socialPose,
	socialTop,
	titlePose
} from './phases';

describe('phases', () => {
	it('finishes the reveal at the split, then opens until the end', () => {
		expect(revealAt(0.25)).toBeCloseTo(0.5);
		expect(camAt(0.25)).toBeCloseTo(0.5);
		expect(camAt(0.5)).toBe(1);
		expect(camAt(1)).toBe(1);
		expect(openAt(0.5)).toBe(0);
		expect(openAt(0.75)).toBeCloseTo(0.5);
		expect(openAt(1)).toBe(1);
	});
});

describe('logoPose', () => {
	it('is centred in phase 1, then shrinks to two thirds and rests near the middle', () => {
		const v = { width: 1440, height: 900 };
		const shut = logoPose(1, 0, v);
		expect(shut.scale).toBe(1);
		expect(shut.dy).toBeCloseTo(0);
		const { scale, dy } = logoPose(1, 1, v);
		expect(scale).toBeCloseTo(2 / 3);
		expect(dy).toBeCloseTo(0);
	});
});

describe('logoWidth', () => {
	it('is limited by the viewport height on a wide screen, with the artwork in proportion', () => {
		const v = { width: 3440, height: 1440 };
		expect(logoWidth(v)).toBeCloseTo(820.8);
		const { w, h } = logoSize(v, 0.5);
		expect(w).toBeCloseTo(logoWidth(v) * 0.5);
		expect(h).toBeCloseTo((w * 197) / 225);
	});
});

describe('titlePose', () => {
	const NAME = 60;
	const SUBTITLE = 20;
	const V = { width: 1440, height: 900 };
	const opens = Array.from({ length: 21 }, (_, i) => i / 20);

	it('fades the name in, then the subtitle, and rests in place once open', () => {
		const at = (open: number) => titlePose(1, open, V, NAME, SUBTITLE, false);
		expect(at(0).name.opacity).toBe(0);
		expect(at(0).subtitle.opacity).toBe(0);
		expect(at(0.5).name.opacity).toBeCloseTo(0.5, 2);
		expect(at(0.5).subtitle.opacity).toBe(0);
		expect(at(0.75).subtitle.opacity).toBeGreaterThan(0);
		expect(at(0.75).subtitle.opacity).toBeLessThan(1);
		expect(at(1).name).toEqual({ dy: 0, opacity: 1 });
		expect(at(1).subtitle).toEqual({ dy: 0, opacity: 1 });
		for (const open of opens) {
			expect(at(open).name.opacity).toBeGreaterThanOrEqual(at(open).subtitle.opacity);
		}
	});

	it('rises one font size per line, the subtitle by its own', () => {
		const { name, subtitle } = titlePose(1, 0.3, V, NAME, SUBTITLE, false);
		expect(name.dy).toBeCloseTo(NAME);
		expect(subtitle.dy).toBeCloseTo(SUBTITLE);
	});

	it('fades in place with reduced motion, still in sequence', () => {
		for (const open of opens) {
			const calm = titlePose(1, open, V, NAME, SUBTITLE, true);
			const full = titlePose(1, open, V, NAME, SUBTITLE, false);
			expect(calm.name.dy).toBe(0);
			expect(calm.subtitle.dy).toBe(0);
			expect(calm.name.opacity).toBe(full.name.opacity);
			expect(calm.subtitle.opacity).toBe(full.subtitle.opacity);
		}
	});

	it.each([
		[1440, 900],
		[3440, 1440],
		[1280, 600],
		[390, 844]
	])('keeps the name below the moving logo at %i×%i', (width, height) => {
		const v = { width, height };
		for (const open of opens) {
			const cam = 1;
			const { scale, dy } = logoPose(cam, open, v);
			const logoBottom = height / 2 + dy + logoSize(v, scale).h / 2;
			expect(titlePose(cam, open, v, NAME, SUBTITLE, false).top).toBeGreaterThanOrEqual(logoBottom);
		}
	});
});

describe('socialPose', () => {
	const opens = Array.from({ length: 21 }, (_, i) => i / 20);
	const V = { width: 1440, height: 900 };

	it('stays hidden until the subtitle is half in, then rises into place as the phase ends', () => {
		expect(socialPose(0, false)).toEqual({ dy: 24, opacity: 0 });
		expect(socialPose(0.7, false)).toEqual({ dy: 24, opacity: 0 });
		expect(socialPose(1, false)).toEqual({ dy: 0, opacity: 1 });
	});

	it('only ever fades in and settles as the scroll advances', () => {
		for (const [i, open] of opens.slice(1).entries()) {
			expect(socialPose(open, false).opacity).toBeGreaterThanOrEqual(
				socialPose(opens[i], false).opacity
			);
			expect(socialPose(open, false).dy).toBeLessThanOrEqual(socialPose(opens[i], false).dy);
		}
	});

	it('fades in place with reduced motion, on the same progress', () => {
		for (const open of opens) {
			expect(socialPose(open, true).dy).toBe(0);
			expect(socialPose(open, true).opacity).toBe(socialPose(open, false).opacity);
		}
	});

	it('is never more visible than the subtitle', () => {
		for (const open of opens) {
			const subtitle = titlePose(1, open, V, 60, 20, false).subtitle.opacity;
			expect(socialPose(open, false).opacity).toBeLessThanOrEqual(subtitle);
		}
	});
});

describe('socialTop', () => {
	it('centres the icons between the subtitle and the bottom edge', () => {
		expect(socialTop({ width: 1440, height: 900 }, 700, 28)).toBeCloseTo(800 - 14);
	});

	it('keeps the icons 16px above the bottom edge when the subtitle runs low', () => {
		expect(socialTop({ width: 1440, height: 900 }, 880, 28)).toBe(900 - 16 - 28);
	});
});
