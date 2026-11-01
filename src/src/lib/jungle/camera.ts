// Every layer sits at a distance from a virtual camera (1 = the nearest regular leaf). The camera
// starts pulled back by DOLLY and moves in with scroll, so near layers grow a lot and far ones barely.
export const DOLLY = 0.8;
export const DEPTH_SPREAD = 2.2;
export const LOGO_DIST = 1 + DEPTH_SPREAD + 0.4;
export const DEEP_DIST = 9;
export const BACK_DIST = 7;

export function zoomAt(dist: number, cam: number): number {
	return dist / (dist + DOLLY * (1 - cam));
}

export function parallaxAt(dist: number, vmin: number): number {
	return vmin * 0.035 * Math.pow(1 / dist, 1.4);
}

export function smoothstep(t: number): number {
	return t * t * (3 - 2 * t);
}

export function clamp01(t: number): number {
	return Math.min(1, Math.max(0, t));
}
