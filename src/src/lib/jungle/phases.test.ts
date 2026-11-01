import { describe, expect, it } from 'vitest';
import {
	camAt,
	logoPose,
	logoSize,
	logoWidth,
	openAt,
	revealAt,
	titleLayout,
	titlePose
} from './phases';

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
		expect(dy).toBeCloseTo(-18);
	});
});

describe('logoWidth', () => {
	it('is limited by the viewport height on a wide screen', () => {
		expect(logoWidth({ width: 3440, height: 1440 })).toBeCloseTo(820.8);
	});
});

describe('logoSize', () => {
	it('keeps the logo artwork in proportion at a given scale', () => {
		const v = { width: 1440, height: 900 };
		const { w, h } = logoSize(v, 0.5);
		expect(w).toBeCloseTo(logoWidth(v) * 0.5);
		expect(h).toBeCloseTo((w * 197) / 225);
		expect(logoSize(v).w).toBeCloseTo(logoWidth(v));
	});
});

describe('titleLayout', () => {
	it('sits under the logo at 1440×900', () => {
		expect(Math.abs(titleLayout({ width: 1440, height: 900 }).top - 609)).toBeLessThanOrEqual(2);
	});

	it.each([
		[1440, 900],
		[3440, 1440],
		[1280, 600],
		[390, 844]
	])('is below the resting logo at %i×%i', (width, height) => {
		const v = { width, height };
		const { scale, dy } = logoPose(1, 1, v);
		const logoBottom = height / 2 + dy + logoSize(v, scale).h / 2;
		expect(titleLayout(v).top).toBeGreaterThan(logoBottom);
	});
});

describe('titlePose', () => {
	const NAME = 60;
	const SUBTITLE = 20;
	const V = { width: 1440, height: 900 };
	const opens = Array.from({ length: 21 }, (_, i) => i / 20);

	it('starts hidden', () => {
		const { name, subtitle } = titlePose(1, 0, V, NAME, SUBTITLE, false);
		expect(name.opacity).toBe(0);
		expect(subtitle.opacity).toBe(0);
	});

	it('fades the name in before the subtitle starts', () => {
		const { name, subtitle } = titlePose(1, 0.5, V, NAME, SUBTITLE, false);
		expect(name.opacity).toBeCloseTo(0.5, 2);
		expect(subtitle.opacity).toBe(0);
	});

	it('has the subtitle part way in at 0.75', () => {
		const { opacity } = titlePose(1, 0.75, V, NAME, SUBTITLE, false).subtitle;
		expect(opacity).toBeGreaterThan(0);
		expect(opacity).toBeLessThan(1);
	});

	it('rests in place once open', () => {
		const { name, subtitle } = titlePose(1, 1, V, NAME, SUBTITLE, false);
		expect(name).toEqual({ dy: 0, opacity: 1 });
		expect(subtitle).toEqual({ dy: 0, opacity: 1 });
	});

	it('rises one font size per line, the subtitle by its own', () => {
		const { name, subtitle } = titlePose(1, 0.3, V, NAME, SUBTITLE, false);
		expect(name.dy).toBeCloseTo(NAME);
		expect(subtitle.dy).toBeCloseTo(SUBTITLE);
	});

	it('never shows the subtitle ahead of the name', () => {
		for (const open of opens) {
			const { name, subtitle } = titlePose(1, open, V, NAME, SUBTITLE, false);
			expect(name.opacity).toBeGreaterThanOrEqual(subtitle.opacity);
		}
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

	it('lands on the resting layout once open', () => {
		expect(titlePose(1, 1, V, NAME, SUBTITLE, false).top).toBe(titleLayout(V).top);
	});
});
