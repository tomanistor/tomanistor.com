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

// Drawn width is `scale` × logoWidth(v); `dy` is pixels below the centre.
export type LogoPose = { scale: number; dy: number };

export function logoPose(cam: number, open: number, v: Viewport): LogoPose {
	return {
		scale: zoomAt(LOGO_DIST, cam) * (1 - (1 - LOGO_REST_SCALE) * open),
		dy: open * LOGO_REST_DY * v.height
	};
}
