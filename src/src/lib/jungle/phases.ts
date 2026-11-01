import { LOGO_DIST, clamp01, smoothstep, zoomAt } from './camera';
import type { Viewport } from './layout';

// The scroll has two phases: the reveal (the camera pushes through the leaves), then the opening.
export const PHASE_SPLIT = 0.5;
export const LOGO_REST_SCALE = 2 / 3;
// Resting logo centre, as a share of viewport height from the middle.
export const LOGO_REST_DY = -0.06;

export const revealAt = (scroll: number): number => clamp01(scroll / PHASE_SPLIT);
export const camAt = (scroll: number): number => smoothstep(revealAt(scroll));
export const openAt = (scroll: number): number =>
	smoothstep(clamp01((scroll - PHASE_SPLIT) / (1 - PHASE_SPLIT)));

export const logoWidth = (v: Viewport): number => Math.min(v.width * 0.5, v.height * 0.57);

export function logoSize(v: Viewport, scale = 1): { w: number; h: number } {
	const w = logoWidth(v) * scale;
	return { w, h: (w * 197) / 225 };
}

// Drawn width is `scale` × logoWidth(v); `dy` is pixels below the centre.
export type LogoPose = { scale: number; dy: number };

export function logoPose(cam: number, open: number, v: Viewport): LogoPose {
	return {
		scale: zoomAt(LOGO_DIST, cam) * (1 - (1 - LOGO_REST_SCALE) * open),
		dy: open * LOGO_REST_DY * v.height
	};
}

// At rest: px from the viewport top to the title's top, and its font size.
export function titleLayout(v: Viewport): { top: number; fontSize: number } {
	const { w, h } = logoSize(v, LOGO_REST_SCALE);
	const dy = LOGO_REST_DY * v.height;
	return {
		top: v.height / 2 + dy + h / 2 + 0.1 * h,
		fontSize: Math.min(40, Math.max(18, 0.082 * w))
	};
}

// The title rises from below the screen to its place; with reduced motion it fades in there.
export function titlePose(
	open: number,
	v: Viewport,
	calm: boolean
): { y: number; opacity: number } {
	const { top } = titleLayout(v);
	return calm ? { y: top, opacity: open } : { y: v.height + (top - v.height) * open, opacity: 1 };
}
