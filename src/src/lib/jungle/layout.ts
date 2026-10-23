import { parallaxAt, zoomAt } from './camera';
import { isFar, type Leaf } from './leaves';
import { SPRITES } from './sprites';

export type Viewport = { width: number; height: number };
type Point = [number, number];

export const DEG = 180 / Math.PI;

export const rotate = ([x, y]: Point, a: number): Point => [
	x * Math.cos(a) - y * Math.sin(a),
	x * Math.sin(a) + y * Math.cos(a)
];

export const normalize = ([x, y]: Point): Point => {
	const l = Math.hypot(x, y) || 1;
	return [x / l, y / l];
};

// Sampled along a parted blade (fraction of length, half-width as a fraction of length) to check
// it clears the logo.
const BLADE: readonly Point[] = [
	[0, 0.3],
	[0.2, 0.42],
	[0.4, 0.46],
	[0.6, 0.42],
	[0.8, 0.3],
	[1, 0.05]
];

export function logoSafeZone(v: Viewport): { safeW: number; safeH: number } {
	const vmin = Math.min(v.width, v.height);
	const logoW = Math.min(v.width * 0.5, v.height * 0.57);
	return { safeW: logoW / 2 + vmin * 0.07, safeH: (logoW * 197) / 225 / 2 + vmin * 0.07 };
}

// Point on the viewport edge (relative to centre) at perimeter fraction u, with its outward normal.
function perimeterPoint(u: number, hw: number, hh: number): { p: Point; n: Point } {
	let d = u * 4 * (hw + hh);
	if (d < 2 * hw) return { p: [-hw + d, -hh], n: [0, -1] };
	d -= 2 * hw;
	if (d < 2 * hh) return { p: [hw, -hh + d], n: [1, 0] };
	d -= 2 * hh;
	if (d < 2 * hw) return { p: [hw - d, hh], n: [0, 1] };
	d -= 2 * hw;
	return { p: [-hw, hh - d], n: [-1, 0] };
}

// Leaves that look alike share one bitmap: same plant, same depth band, same focus.
export function bakeKey(leaf: Leaf): string {
	const kind = isFar(leaf) ? 'far' : leaf.foreground ? 'fg' : 'mid';
	const band = kind === 'mid' ? Math.round(leaf.depth * 3) / 3 : kind === 'fg' ? 1 : 0.1;
	return `${SPRITES.indexOf(leaf.sprite)}|${kind}|${band}`;
}

export function layoutLeaves(leaves: Leaf[], v: Viewport): void {
	const hw = v.width / 2;
	const hh = v.height / 2;
	const vmin = Math.min(v.width, v.height);
	const { safeW, safeH } = logoSafeZone(v);
	const margin = vmin * 0.03;
	// A monstera at the nearest regular layer is this long; everything else scales from it.
	const unit = 0.55 * Math.max(vmin, 0.62 * Math.max(v.width, v.height));

	for (const leaf of leaves) {
		const { p, n } = perimeterPoint(leaf.u, hw, hh);
		const z0 = zoomAt(leaf.dist, 0);
		const inward: Point = [-n[0], -n[1]];
		const toCentre = normalize([-p[0], -p[1]]);
		const dir0 = rotate(
			normalize([inward[0] * 0.6 + toCentre[0] * 0.4, inward[1] * 0.6 + toCentre[1] * 0.4]),
			leaf.jitter / DEG
		);
		const dir1 = rotate(dir0, leaf.swing / DEG);
		const perp: Point = [-dir1[1], dir1[0]];
		// Perspective: further layers look smaller, but gently, so the jungle reads as one scene.
		const length = leaf.sprite.size * unit * leaf.scale * Math.pow(1 / leaf.dist, 0.6);
		// Far enough off-screen that cursor parallax never drags a stem into view.
		const offEdge = margin + parallaxAt(leaf.dist, vmin) * 1.2;

		// Anchors are in world space, placed so they land on screen where intended at the starting zoom.
		const place = (inset: number) => {
			const start: Point =
				inset > 0
					? [p[0] * (1 - inset), p[1] * (1 - inset)]
					: [p[0] + n[0] * offEdge, p[1] + n[1] * offEdge];
			const anchor: Point = [start[0] / z0, start[1] / z0];
			const out = inset > 0 ? normalize(start) : n;
			const hits = (pull: number) =>
				BLADE.some(([f, lat]) =>
					[-1, 1].some((side) => {
						const x =
							anchor[0] + out[0] * pull + dir1[0] * length * f + perp[0] * length * lat * side;
						const y =
							anchor[1] + out[1] * pull + dir1[1] * length * f + perp[1] * length * lat * side;
						return Math.abs(x) < safeW && Math.abs(y) < safeH;
					})
				);
			let pull = leaf.retract * vmin;
			for (let i = 0; i < 120 && hits(pull); i++) pull += vmin * 0.02;
			return { anchor, out, pull };
		};

		// A plant can only lean aside so far: an inset leaf that would have to slide a long way to
		// clear the logo is rooted further out instead.
		let inset = leaf.inset;
		let placed = place(inset);
		while (inset > 0.02 && placed.pull > vmin * 0.08) {
			inset = Math.max(0.02, inset - 0.03);
			placed = place(inset);
		}

		const { base, tip } = leaf.sprite;
		const mid: Point = [(tip[0] - base[0]) * leaf.flip, tip[1] - base[1]];
		leaf.anchor = placed.anchor;
		leaf.n = placed.out;
		// Leaves right by the lens sweep out of frame as the camera pushes through them.
		leaf.pull = placed.pull + (leaf.foreground ? vmin * 0.2 : 0);
		leaf.dir0 = dir0;
		leaf.len = length;
		leaf.rot0 = Math.atan2(dir0[1], dir0[0]) * DEG - Math.atan2(mid[1], mid[0]) * DEG;
		leaf.cssPerPx = length / Math.hypot(mid[0], mid[1]);
		leaf.key = bakeKey(leaf);
	}
}

// Shadow under the foliage: clear around the logo, darkening toward the edges, so gaps between
// leaves read as depth rather than empty page.
export function shadeGradient(v: Viewport): string {
	const { safeW, safeH } = logoSafeZone(v);
	return (
		`radial-gradient(ellipse ${(safeW * 1.3).toFixed(0)}px ${(safeH * 1.35).toFixed(0)}px at 50% 50%, ` +
		'rgba(12, 36, 20, 0) 72%, rgba(12, 36, 20, 0.25) 88%, rgba(10, 30, 17, 0.45) 100%)'
	);
}
