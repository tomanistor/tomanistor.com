import { LOGO_DIST, clamp01, smoothstep, zoomAt } from './camera';
import type { Viewport } from './layout';

// The scroll has two phases: the reveal (the camera pushes through the leaves), then the opening.
export const PHASE_SPLIT = 0.5;
export const LOGO_REST_SCALE = 2 / 3;
// Resting logo centre, as a share of viewport height from the middle.
export const LOGO_REST_DY = -0.06;
// Space between the resting logo and the name, as a share of the logo's height.
const TITLE_GAP = 0.09;

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

// px from the viewport top to the name's top: under the logo as drawn in `pose`.
function titleTop(pose: LogoPose, v: Viewport): number {
	const { h } = logoSize(v, pose.scale);
	return v.height / 2 + pose.dy + h / 2 + TITLE_GAP * h;
}

// At rest: px from the viewport top to the name's top.
export const titleLayout = (v: Viewport): { top: number } => ({
	top: titleTop(logoPose(1, 1, v), v)
});

export const MIN_SUBTITLE_SIZE = 12;

export type LinePose = { dy: number; opacity: number };

// The name's top follows the logo's current pose, so the title moves with the logo and never
// overlaps it. Each line fades in while rising its own font size into place, the name first. `dy` is
// pixels below the line's resting place; with reduced motion the lines fade in place.
export function titlePose(
	cam: number,
	open: number,
	v: Viewport,
	nameSize: number,
	subtitleSize: number,
	calm: boolean
): { top: number; name: LinePose; subtitle: LinePose } {
	const line = (from: number, to: number, size: number): LinePose => {
		const progress = smoothstep(clamp01((open - from) / (to - from)));
		return { dy: calm ? 0 : (1 - progress) * size, opacity: progress };
	};
	return {
		top: titleTop(logoPose(cam, open, v), v),
		name: line(0.3, 0.7, nameSize),
		subtitle: line(0.5, 1, subtitleSize)
	};
}
