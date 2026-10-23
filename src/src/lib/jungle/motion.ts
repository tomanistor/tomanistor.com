import { clamp01, parallaxAt, smoothstep, zoomAt } from './camera';
import type { Leaf } from './leaves';
import { DEG, normalize, rotate } from './layout';

const TAU = Math.PI * 2;

type Spring = { t: number; v: number };
type Pointer = { x: number; y: number };

// `look` is the smoothed cursor position (-1..1 per axis) and `pointer` the raw one in pixels;
// `sweep` is how far the cursor moved outward from the centre this frame.
export type FrameInput = {
	scroll: number;
	cam: number;
	time: number;
	look: Pointer;
	sweep: number;
	pointer: Pointer | null;
	calm: boolean;
	width: number;
	height: number;
};

export function spring(state: Spring, target: number, k: number, zeta: number, dt: number): void {
	const c = 2 * Math.sqrt(k) * zeta;
	for (let i = 0, h = dt / 2; i < 2; i++) {
		state.v += (k * (target - state.t) - c * state.v) * h;
		state.t += state.v * h;
	}
}

export function scrollFraction(
	scrollY: number,
	scrollHeight: number,
	viewportHeight: number
): number {
	const max = scrollHeight - viewportHeight;
	return max > 0 ? clamp01(scrollY / max) : 0;
}

// Front leaves part first, back leaves follow, so the layers separate.
export function leafTarget(leaf: Leaf, scroll: number): number {
	const delay = clamp01((1 - leaf.depth) * 0.3 + leaf.lag);
	return smoothstep(clamp01((scroll - delay) / (1 - delay)));
}

// Only movement away from the centre brushes leaves, like a hand easing foliage aside.
export function outwardSweep(
	prev: Pointer | null,
	next: Pointer,
	width: number,
	height: number
): number {
	if (!prev) return 0;
	const radial = normalize([next.x - width / 2, next.y - height / 2]);
	return Math.min(60, Math.max(0, (next.x - prev.x) * radial[0] + (next.y - prev.y) * radial[1]));
}

export function stepLeaf(leaf: Leaf, f: FrameInput, dt: number): string {
	const anchor = leaf.anchor!;
	const n = leaf.n!;
	const origin = leaf.origin!;
	const vmin = Math.min(f.width, f.height);

	spring(leaf, leafTarget(leaf, f.scroll), leaf.stiffness, 1, dt);
	const t = leaf.t;
	const zoom = zoomAt(leaf.dist, f.cam);
	const out = leaf.pull! * t;
	const parallax = parallaxAt(leaf.dist, vmin);
	let ax = f.width / 2 + (anchor[0] + n[0] * out) * zoom - f.look.x * parallax;
	let ay = f.height / 2 + (anchor[1] + n[1] * out) * zoom - f.look.y * parallax;

	if (f.sweep > 0 && f.pointer) {
		const blade = rotate(leaf.dir0!, (leaf.swing * t) / DEG);
		const reach = leaf.len! * zoom;
		const dx = f.pointer.x - (ax + blade[0] * reach * 0.5);
		const dy = f.pointer.y - (ay + blade[1] * reach * 0.5);
		const near = Math.max(0, 1 - Math.hypot(dx, dy) / (reach * 0.55 + vmin * 0.06));
		// Tip the blade away from whichever side the hand passes on.
		const side = blade[0] * dy - blade[1] * dx > 0 ? -1 : 1;
		leaf.brush.v += f.sweep * Math.pow(near, 1.5) * side * 0.055;
	}
	spring(leaf.brush, 0, 9, 0.85, dt);
	const brushed = Math.tanh(leaf.brush.t);
	const give = Math.abs(brushed) * vmin * 0.01;
	ax += n[0] * give;
	ay += n[1] * give;

	// Still most of the time; now and then this one leaf stirs for a couple of seconds.
	const cycle = (f.time + leaf.swayOffset) % leaf.swayPeriod;
	const stir = f.calm ? 0 : Math.exp(-(((cycle - leaf.swayPeriod / 2) / 0.8) ** 2));
	const sway = Math.sin(f.time * 1.1 * TAU + leaf.swayPhase) * stir * leaf.swayAmp;
	// Movement speed reads as wind: leaves flutter and tip while they swing aside.
	const gust = f.calm ? 0 : Math.max(-1, Math.min(1, leaf.v * 1.5));
	const rot = leaf.rot0! + leaf.swing * t + sway + gust * leaf.flutter * 0.35 + brushed * 5;
	const tilt = gust * leaf.flutter * 0.6;

	return (
		`translate3d(${(ax - origin[0]).toFixed(1)}px, ${(ay - origin[1]).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) ` +
		`rotate3d(${Math.cos(leaf.tiltAxis).toFixed(3)}, ${Math.sin(leaf.tiltAxis).toFixed(3)}, 0, ${tilt.toFixed(2)}deg) ` +
		`scale(${(zoom * leaf.flip).toFixed(4)}, ${zoom.toFixed(4)})`
	);
}
