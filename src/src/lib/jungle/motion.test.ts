import { describe, expect, it } from 'vitest';
import { zoomAt } from './camera';
import { generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { leafPose, leafTarget, outwardSweep, spring, type FrameInput } from './motion';

const VIEWPORT = { width: 1440, height: 900 };

function liveLeaves(): Leaf[] {
	const leaves = generateLeaves(11, 1);
	layoutLeaves(leaves, VIEWPORT);
	return leaves.filter((l) => !isFar(l)).map((l) => ({ ...l, origin: [0, 0] }));
}

const frame = (over: Partial<FrameInput> = {}): FrameInput => ({
	scroll: 0,
	cam: 0,
	open: 0,
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
			expect(leafTarget(leaf, 0.5)).toBe(1);
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
	it('is zero when moving toward the centre and positive when moving away', () => {
		expect(outwardSweep({ x: 100, y: 100 }, { x: 300, y: 250 }, 1440, 900)).toBe(0);
		expect(outwardSweep({ x: 600, y: 400 }, { x: 400, y: 300 }, 1440, 900)).toBeGreaterThan(0);
	});
});

describe('leafPose', () => {
	it('adds no idle stir, flutter or tilt when calm', () => {
		for (const leaf of liveLeaves()) {
			const a = leafPose(leaf, frame({ calm: true, time: 3 }), 1 / 60);
			const b = leafPose(leaf, frame({ calm: true, time: 17 }), 1 / 60);
			expect(b.rotation).toBe(a.rotation);
			expect(b.tilt).toBeCloseTo(0);
		}
	});

	it('keeps brush tilt within 5 degrees', () => {
		for (const leaf of liveLeaves()) {
			for (let i = 0; i < 120; i++) {
				const [cx, cy] = [720 + leaf.anchor![0], 450 + leaf.anchor![1]];
				const pose = leafPose(leaf, frame({ sweep: 60, pointer: { x: cx, y: cy } }), 1 / 60);
				const resting = leaf.rot0! + leaf.swing * leaf.t;
				expect(Math.abs(pose.rotation - resting)).toBeLessThanOrEqual(5 + leaf.swayAmp);
			}
		}
	});

	it('moves a leaf out by its exit as the arch opens', () => {
		for (const leaf of liveLeaves().filter((l) => l.exit! > 0)) {
			const input = frame({ calm: true, scroll: 0.5, cam: 1 });
			for (let i = 0; i < 600; i++) leafPose(leaf, input, 1 / 60);
			const shut = leafPose(leaf, input, 1 / 60);
			const open = leafPose(leaf, { ...input, open: 1 }, 1 / 60);
			const zoom = zoomAt(leaf.dist, 1);
			expect(open.x - shut.x).toBeCloseTo(leaf.n![0] * leaf.exit! * zoom, 6);
			expect(open.y - shut.y).toBeCloseTo(leaf.n![1] * leaf.exit! * zoom, 6);
		}
	});
});
