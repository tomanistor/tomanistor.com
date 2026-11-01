import { SHADOW_PAD } from './bake';
import { parallaxAt, zoomAt } from './camera';
import { isFar, type Leaf } from './leaves';
import { LOGO_REST_SCALE, logoSize } from './phases';
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

// Points around the ellipse inscribed in a photo's crop, as fractions of the crop. Leaves fill
// most of it; the corners are mostly bare.
const PHOTO_EDGE: readonly Point[] = Array.from(
	{ length: 16 },
	(_, i): Point => [
		0.5 + 0.5 * Math.cos((i * Math.PI) / 8),
		0.5 + 0.5 * Math.sin((i * Math.PI) / 8)
	]
);

export function logoSafeZone(v: Viewport): { safeW: number; safeH: number } {
	const vmin = Math.min(v.width, v.height);
	const { w, h } = logoSize(v);
	return { safeW: w / 2 + vmin * 0.13, safeH: h / 2 + vmin * 0.13 };
}

export const OPEN_WIDEN = 1.15;

// Where the leaves must have parted to by the end of the reveal; wider than the zone that merely
// keeps the logo clear.
export function openingZone(v: Viewport): { safeW: number; safeH: number } {
	const { safeW, safeH } = logoSafeZone(v);
	return { safeW: safeW * OPEN_WIDEN, safeH: safeH * OPEN_WIDEN };
}

// Centre-relative px at cam 1, keyed to the resting logo. The opening: above the bottom of the
// screen, |x| < half, and either below cy or inside the top half-ellipse.
export type Arch = { cy: number; half: number; rTop: number; bottom: number };

// Deliberately separate from LOGO_REST_DY, so the arch stays put when the logo moves.
export const ARCH_DY = -0.06;

export function archZone(v: Viewport): Arch {
	const vmin = Math.min(v.width, v.height);
	const { w, h } = logoSize(v, LOGO_REST_SCALE);
	return {
		cy: ARCH_DY * v.height,
		half: Math.min(w / 2 + 0.13 * vmin + 0.22 * vmin, 0.34 * v.width),
		rTop: h / 2 + 0.13 * vmin,
		bottom: v.height / 2
	};
}

export const inArch = (x: number, y: number, a: Arch): boolean =>
	y < a.bottom &&
	Math.abs(x) < a.half &&
	(y >= a.cy || (x / a.half) ** 2 + ((y - a.cy) / a.rTop) ** 2 < 1);

// Where the page must end up blank once the arch opens: the bottom middle, centre-relative px at
// cam 1, as [x0, y0, x1, y1], grown by `margin` on every side.
export function blankZone(v: Viewport, margin = 0): [number, number, number, number] {
	return [
		-0.2 * v.width - margin,
		0.25 * v.height - margin,
		0.2 * v.width + margin,
		0.5 * v.height + margin
	];
}

// Whether a convex quad (corners in order) overlaps an axis-aligned box, by separating axes.
function overlaps(quad: Point[], [x0, y0, x1, y1]: readonly number[]): boolean {
	const box: Point[] = [
		[x0, y0],
		[x1, y0],
		[x1, y1],
		[x0, y1]
	];
	const axes: Point[] = [
		[1, 0],
		[0, 1],
		[quad[0][1] - quad[1][1], quad[1][0] - quad[0][0]],
		[quad[1][1] - quad[2][1], quad[2][0] - quad[1][0]]
	];
	return axes.every(([ax, ay]) => {
		const a = quad.map(([x, y]) => x * ax + y * ay);
		const b = box.map(([x, y]) => x * ax + y * ay);
		return Math.max(...a) > Math.min(...b) && Math.max(...b) > Math.min(...a);
	});
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
	const clear = logoSafeZone(v);
	const open = openingZone(v);
	const arch = archZone(v);
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
		const girth = leaf.sprite.girth ?? 1;
		// Perspective: further layers look smaller, but gently, so the jungle reads as one scene.
		const length = leaf.sprite.size * unit * leaf.scale * Math.pow(1 / leaf.dist, 0.6);
		// Far enough off-screen that cursor parallax never drags a stem into view.
		const offEdge = margin + parallaxAt(leaf.dist, vmin) * 1.2;

		const { base, tip, crop } = leaf.sprite;
		const mid: Point = [(tip[0] - base[0]) * leaf.flip, tip[1] - base[1]];
		// Photo pixels (within the crop) in blade lengths along and across the midrib.
		const m2 = mid[0] ** 2 + mid[1] ** 2;
		const toBlade = ([x, y]: Point): Point => {
			const q: Point = [(x - base[0]) * leaf.flip, y - base[1]];
			return [(q[0] * mid[0] + q[1] * mid[1]) / m2, (q[1] * mid[0] - q[0] * mid[1]) / m2];
		};
		const at = (root: Point, [f, lat]: Point): Point => [
			root[0] + dir1[0] * length * f + perp[0] * length * lat,
			root[1] + dir1[1] * length * f + perp[1] * length * lat
		];
		// Some blades spread well past the samples below, and the bottom of the arch must end up
		// blank. The photo's outline is generous, so it is only held below the arch's centre: above
		// it, a far leaf would have to fall through the clearing to get out.
		const photo = PHOTO_EDGE.map(([fx, fy]) => toBlade([fx * crop[2], fy * crop[3]]));
		// The whole baked bitmap, drop shadow included.
		const pad = SHADOW_PAD * Math.max(crop[2], crop[3]);
		const footprint = (
			[
				[-pad, -pad],
				[crop[2] + pad, -pad],
				[crop[2] + pad, crop[3] + pad],
				[-pad, crop[3] + pad]
			] as Point[]
		).map(toBlade);

		// A wide plant is checked at both its blade width and its full width, so the logo can't slip
		// between the sample points.
		const widths = girth > 1 ? [-girth, -1, 1, girth] : [-1, 1];
		const touches = (root: Point, inside: (x: number, y: number) => boolean) =>
			BLADE.some(([f, lat]) =>
				widths.some((w) =>
					inside(
						root[0] + dir1[0] * length * f + perp[0] * length * lat * w,
						root[1] + dir1[1] * length * f + perp[1] * length * lat * w
					)
				)
			);

		// Anchors are in world space, placed so they land on screen where intended at the starting zoom.
		const place = (inset: number, zone: { safeW: number; safeH: number }) => {
			const start: Point =
				inset > 0
					? [p[0] * (1 - inset), p[1] * (1 - inset)]
					: [p[0] + n[0] * offEdge, p[1] + n[1] * offEdge];
			const anchor: Point = [start[0] / z0, start[1] / z0];
			const out = inset > 0 ? normalize(start) : n;
			const hits = (pull: number) =>
				touches(
					[anchor[0] + out[0] * pull, anchor[1] + out[1] * pull],
					(x, y) => Math.abs(x) < zone.safeW && Math.abs(y) < zone.safeH
				);
			let pull = leaf.retract * vmin;
			for (let i = 0; i < 120 && hits(pull); i++) pull += vmin * 0.02;
			return { anchor, out, pull };
		};

		// A plant can only lean aside so far: an inset leaf that would have to slide a long way to
		// clear the logo is rooted further out instead.
		let inset = leaf.inset;
		let placed = place(inset, clear);
		while (inset > 0.02 && placed.pull > vmin * 0.14) {
			inset = Math.max(0.02, inset - 0.03);
			placed = place(inset, clear);
		}

		placed = place(inset, open);

		leaf.anchor = placed.anchor;
		leaf.n = placed.out;
		// Leaves right by the lens sweep out of frame as the camera pushes through them.
		leaf.pull = placed.pull + (leaf.foreground ? vmin * 0.2 : 0);
		// The arch opens by moving leaves out along their way out; a far layer is baked flat, so its
		// leaves can only drop out through the bottom together.
		const parted: Point = [
			placed.anchor[0] + placed.out[0] * leaf.pull,
			placed.anchor[1] + placed.out[1] * leaf.pull
		];
		const away: Point = isFar(leaf) ? [0, 1] : placed.out;
		// Leaves stir a little once parted and shift with the cursor, so they are held further off.
		const blank = blankZone(v, vmin * 0.02 + parallaxAt(leaf.dist, vmin));
		const inside = (x: number, y: number) => inArch(x, y, arch);
		const blocked = (exit: number) => {
			const root: Point = [parted[0] + away[0] * exit, parted[1] + away[1] * exit];
			return (
				touches(root, inside) ||
				photo.some((point) => {
					const [x, y] = at(root, point);
					return y >= arch.cy && inside(x, y);
				}) ||
				overlaps(
					footprint.map((point) => at(root, point)),
					blank
				)
			);
		};
		let exit = 0;
		for (let i = 0; i < 500 && blocked(exit); i++) exit += vmin * 0.02;
		leaf.exit = exit;
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
	const { safeW, safeH } = openingZone(v);
	return (
		`radial-gradient(ellipse ${(safeW * 1.3).toFixed(0)}px ${(safeH * 1.35).toFixed(0)}px at 50% 50%, ` +
		'rgba(12, 36, 20, 0) 72%, rgba(12, 36, 20, 0.25) 88%, rgba(10, 30, 17, 0.45) 100%)'
	);
}
