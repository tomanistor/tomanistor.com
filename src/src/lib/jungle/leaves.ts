import { DEPTH_SPREAD } from './camera';
import { between, mulberry32 } from './random';
import { pickSprite, type Sprite } from './sprites';

export type Role = 'deep' | 'backing' | 'frame' | 'core' | 'foreground';

type Range = [number, number];
type Point = [number, number];

type Group = {
	role: Role;
	count: number;
	jitter: number;
	swing: Range;
	depth: Range;
	grow?: number;
	dist?: Range;
	inset?: Range;
	defocus?: number;
};

export type Leaf = {
	role: Role;
	sprite: Sprite;
	u: number;
	inset: number;
	defocus?: number;
	scale: number;
	jitter: number;
	swing: number;
	depth: number;
	dist: number;
	foreground: boolean;
	flip: 1 | -1;
	swayAmp: number;
	swayPeriod: number;
	swayOffset: number;
	swayPhase: number;
	lag: number;
	stiffness: number;
	flutter: number;
	tiltAxis: number;
	retract: number;
	t: number;
	v: number;
	brush: { t: number; v: number };
	// Assigned by layout and baking.
	anchor?: Point;
	n?: Point;
	pull?: number;
	dir0?: Point;
	len?: number;
	rot0?: number;
	cssPerPx?: number;
	key?: string;
	box?: Point;
	origin?: Point;
};

// The order and counts are part of the approved arrangement: changing either reshuffles every leaf.
export const GROUPS: readonly Group[] = [
	{
		role: 'deep',
		count: 140,
		jitter: 40,
		swing: [2, 5],
		depth: [0, 0.1],
		grow: 1.3,
		dist: [8, 10],
		inset: [0.05, 0.28],
		defocus: 0
	},
	{
		role: 'backing',
		count: 200,
		jitter: 30,
		swing: [3, 8],
		depth: [0, 0.2],
		grow: 1.4,
		dist: [6, 8],
		defocus: 0
	},
	{ role: 'frame', count: 120, jitter: 34, swing: [10, 24], depth: [0, 1] },
	{ role: 'core', count: 26, jitter: 30, swing: [18, 34], depth: [0.25, 0.6], inset: [0.22, 0.55] },
	// Cover leaves reach across the logo at the start and clear it by swinging aside on their stem.
	{ role: 'core', count: 14, jitter: 22, swing: [38, 55], depth: [0.6, 0.85], inset: [0.3, 0.45] },
	{ role: 'foreground', count: 6, jitter: 26, swing: [20, 34], depth: [1, 1], dist: [0.45, 0.6] }
];

export function densityFor(width: number, height: number): number {
	return Math.min(1, Math.max(0.45, (width * height) / (1440 * 900)));
}

export function isFar(leaf: Leaf): boolean {
	return leaf.role === 'deep' || leaf.role === 'backing';
}

export function generateLeaves(seed: number, density: number): Leaf[] {
	const rand = mulberry32(seed);
	const rnd = (range: Range) => between(rand, ...range);
	const sign = () => (rand() < 0.5 ? -1 : 1);
	const leaves: Leaf[] = [];

	// Draws happen in the reference's exact order so the approved arrangement is reproduced.
	for (const g of GROUPS) {
		const count = Math.max(2, Math.round(g.count * density));
		for (let i = 0; i < count; i++) {
			const depth = rnd(g.depth);
			const jitter = between(rand, -g.jitter, g.jitter);
			const sprite = pickSprite(rand, depth, g.role);
			// Stratified around the perimeter so no stretch of edge is left bare.
			const u = (i + between(rand, 0.15, 0.85)) / count;
			const inset = g.inset ? rnd(g.inset) : 0;
			const scale = between(rand, 0.85, 1.15) * (g.grow ?? 1);
			// Parting pushes each leaf further the way it already leans.
			const swing = rnd(g.swing) * (Math.abs(jitter) > 4 ? Math.sign(jitter) : sign());
			const dist = g.dist ? rnd(g.dist) : 1 + (1 - depth) * DEPTH_SPREAD;
			leaves.push({
				role: g.role,
				sprite,
				u,
				inset,
				defocus: g.defocus,
				scale,
				jitter,
				swing,
				depth,
				dist,
				foreground: g.role === 'foreground',
				flip: sign(),
				swayAmp: between(rand, 0.25, 0.7),
				swayPeriod: between(rand, 12, 35),
				swayOffset: between(rand, 0, 35),
				swayPhase: between(rand, 0, Math.PI * 2),
				lag: between(rand, -0.06, 0.06),
				stiffness: between(rand, 12, 22),
				flutter: between(rand, 3, 7) * sign(),
				tiltAxis: between(rand, 0, Math.PI * 2),
				retract: 0,
				t: 0,
				v: 0,
				brush: { t: 0, v: 0 }
			});
		}
	}
	// A separate pass, so it can't shift the draws above.
	for (const leaf of leaves) leaf.retract = between(rand, 0.01, 0.05);

	return leaves.sort((a, b) => b.dist - a.dist);
}
