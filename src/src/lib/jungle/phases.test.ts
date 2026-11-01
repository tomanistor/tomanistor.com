import { describe, expect, it } from 'vitest';
import { camAt, logoPose, logoWidth, openAt, revealAt, titleLayout } from './phases';

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

describe('titleLayout', () => {
	it('sits under the logo at 1440×900', () => {
		const { top, fontSize } = titleLayout({ width: 1440, height: 900 });
		expect(Math.abs(top - 576)).toBeLessThanOrEqual(2);
		expect(Math.abs(fontSize - 28)).toBeLessThanOrEqual(0.5);
	});

	it('keeps the smallest size on a phone', () => {
		expect(titleLayout({ width: 390, height: 844 }).fontSize).toBe(18);
	});

	it('is capped at 40px on a large screen', () => {
		expect(titleLayout({ width: 3440, height: 1440 }).fontSize).toBeLessThanOrEqual(40);
	});

	it.each([
		[1440, 900],
		[3440, 1440],
		[1280, 600],
		[390, 844]
	])('is below the resting logo at %i×%i', (width, height) => {
		const v = { width, height };
		const { scale, dy } = logoPose(1, 1, v);
		const logoBottom = height / 2 + dy + (logoWidth(v) * scale * 197) / 225 / 2;
		expect(titleLayout(v).top).toBeGreaterThan(logoBottom);
	});
});
