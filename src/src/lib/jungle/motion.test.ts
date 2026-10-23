import { describe, expect, it } from 'vitest';
import { generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { leafTarget, outwardSweep, spring, stepLeaf, type FrameInput } from './motion';

const VIEWPORT = { width: 1440, height: 900 };

function liveLeaves(): Leaf[] {
	const leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, VIEWPORT);
	return leaves.filter((l) => !isFar(l)).map((l) => ({ ...l, origin: [0, 0] }));
}

const frame = (over: Partial<FrameInput> = {}): FrameInput => ({
	scroll: 0,
	cam: 0,
	time: 0,
	look: { x: 0, y: 0 },
	sweep: 0,
	pointer: null,
	calm: false,
	...VIEWPORT,
	...over
});

describe('spring', () => {
	it('never overshoots with zeta 1', () => {
		const s = { t: 0, v: 0 };
		for (let i = 0; i < 600; i++) {
			spring(s, 1, 16, 1, 1 / 60);
			expect(s.t).toBeLessThanOrEqual(1 + 1e-6);
		}
		expect(s.t).toBeCloseTo(1, 3);
	});
});

describe('leafTarget', () => {
	it('is monotonic in scroll and spans 0..1', () => {
		for (const leaf of generateLeaves(11, 1)) {
			expect(leafTarget(leaf, 0)).toBe(0);
			expect(leafTarget(leaf, 1)).toBe(1);
			let prev = 0;
			for (let s = 0; s <= 1.0001; s += 0.05) {
				const t = leafTarget(leaf, s);
				expect(t).toBeGreaterThanOrEqual(prev);
				prev = t;
			}
		}
	});
});

describe('outwardSweep', () => {
	it('is zero when moving toward the centre', () => {
		expect(outwardSweep({ x: 100, y: 100 }, { x: 300, y: 250 }, 1440, 900)).toBe(0);
	});
	it('is positive when moving away from the centre, capped at 60', () => {
		expect(outwardSweep({ x: 600, y: 400 }, { x: 400, y: 300 }, 1440, 900)).toBeGreaterThan(0);
		expect(outwardSweep({ x: 720, y: 450 }, { x: 0, y: 0 }, 1440, 900)).toBe(60);
	});
	it('is zero without a previous position', () => {
		expect(outwardSweep(null, { x: 0, y: 0 }, 1440, 900)).toBe(0);
	});
});

describe('stepLeaf', () => {
	it('adds no idle stir, flutter or tilt when calm', () => {
		for (const leaf of liveLeaves()) {
			const a = stepLeaf(leaf, frame({ calm: true, time: 3 }), 1 / 60);
			const b = stepLeaf(leaf, frame({ calm: true, time: 17 }), 1 / 60);
			expect(b).toBe(a);
		}
	});

	it('keeps brush tilt within 5 degrees', () => {
		for (const leaf of liveLeaves()) {
			for (let i = 0; i < 120; i++) {
				const [cx, cy] = [720 + leaf.anchor![0], 450 + leaf.anchor![1]];
				stepLeaf(leaf, frame({ sweep: 60, pointer: { x: cx, y: cy } }), 1 / 60);
				expect(Math.abs(Math.tanh(leaf.brush.t) * 5)).toBeLessThanOrEqual(5);
			}
		}
	});

	it('returns an identical transform when nothing changes', () => {
		const [leaf] = liveLeaves();
		const input = frame({ calm: true });
		stepLeaf(leaf, input, 1 / 60);
		expect(stepLeaf(leaf, input, 1 / 60)).toBe(stepLeaf(leaf, input, 1 / 60));
	});
});
