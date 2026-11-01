import { isFar, type Leaf } from './leaves';
import type { Viewport } from './layout';
import { abandon, pacer, type Pace } from './pace';

type Point = [number, number];

export type Bitmap = {
	canvas: HTMLCanvasElement;
	cssPerPx: number;
	box: Point;
	origin: Point;
};

export const SHADOW_PAD = 0.12;
const MAX_CANVAS = 2200;
// No screen draws more pixels than a 1440×900 Retina laptop, the size the scene is tuned at.
const MAX_RENDER_PIXELS = 1440 * 900 * 4;

// Bake pixels per CSS pixel; `sharp` caps the device pixel ratio for in-focus mid leaves.
export const BAKE_RES = { fg: 0.35, far: 0.6, soft: 0.75, sharp: 1.25 };

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	return canvas.getContext('2d')!;
}

// Cropped, shaded by depth, with its drop shadow and focus drawn in. Out-of-focus leaves are baked
// at low resolution, since the blur hides it; the far layers get their blur as a whole, later.
function bake(
	leaf: Leaf,
	cssPerPx: number,
	img: HTMLImageElement,
	dpr: number,
	blurScale: number
): Bitmap {
	const { crop, base, coordWidth } = leaf.sprite;
	const [x, y, w, h] = crop;
	const k = img.naturalWidth / coordWidth;
	const kind = isFar(leaf) ? 'far' : leaf.foreground ? 'fg' : 'mid';
	const depth = kind === 'mid' ? Math.round(leaf.depth * 3) / 3 : kind === 'fg' ? 1 : 0.1;
	const cssW = w * cssPerPx;
	const cssH = h * cssPerPx;
	const defocus = kind === 'fg' ? 7 : kind === 'far' ? 0 : Math.max(0, (0.35 - depth) / 0.35) * 1.5;
	const want =
		kind === 'fg'
			? BAKE_RES.fg * blurScale
			: kind === 'far'
				? BAKE_RES.far * blurScale
				: defocus > 0
					? BAKE_RES.soft * blurScale
					: Math.min(dpr, BAKE_RES.sharp);
	const res = Math.min(want, MAX_CANVAS / Math.max(cssW, cssH));
	const lw = Math.round(cssW * res);
	const lh = Math.round(cssH * res);
	const pad = Math.round(Math.max(lw, lh) * SHADOW_PAD);

	const shaded = document.createElement('canvas');
	shaded.width = lw;
	shaded.height = lh;
	const sc = context(shaded);
	sc.drawImage(img, x * k, y * k, w * k, h * k, 0, 0, lw, lh);
	sc.globalCompositeOperation = 'source-atop';
	sc.fillStyle = `rgba(4, 22, 10, ${(0.45 * (1 - depth)).toFixed(3)})`;
	sc.fillRect(0, 0, lw, lh);

	const canvas = document.createElement('canvas');
	canvas.width = lw + pad * 2;
	canvas.height = lh + pad * 2;
	const ctx = context(canvas);
	const shadow = (6 + 18 * depth + (kind === 'fg' ? 20 : 0)) * res;
	if (defocus > 0) ctx.filter = `blur(${(defocus * res).toFixed(1)}px)`;
	ctx.shadowColor = `rgba(5, 25, 10, ${(0.25 + 0.3 * depth).toFixed(2)})`;
	ctx.shadowBlur = shadow;
	ctx.shadowOffsetY = shadow * 0.5;
	ctx.drawImage(shaded, pad, pad);
	shaded.width = 0;

	return {
		canvas,
		cssPerPx,
		box: [canvas.width / res, canvas.height / res],
		origin: [pad / res + base[0] * cssPerPx, pad / res + base[1] * cssPerPx]
	};
}

// One bitmap per bake key, at the largest size any of its leaves needs; smaller leaves scale it down.
export async function bakeAll(
	leaves: Leaf[],
	images: Map<string, HTMLImageElement>,
	dpr: number,
	blurScale: number,
	pace: Pace = pacer(() => true)
): Promise<Map<string, Bitmap>> {
	const largest = new Map<string, Leaf>();
	for (const leaf of leaves) {
		const prev = largest.get(leaf.key!);
		if (!prev || prev.cssPerPx! < leaf.cssPerPx!) largest.set(leaf.key!, leaf);
	}
	const bitmaps = new Map<string, Bitmap>();
	try {
		for (const [key, leaf] of largest) {
			await pace();
			bitmaps.set(key, bake(leaf, leaf.cssPerPx!, images.get(leaf.sprite.src)!, dpr, blurScale));
		}
	} catch (error) {
		abandon(error, () => releaseBitmaps(bitmaps));
	}
	for (const leaf of leaves) {
		const b = bitmaps.get(leaf.key!)!;
		const s = leaf.cssPerPx! / b.cssPerPx;
		leaf.box = [b.box[0] * s, b.box[1] * s];
		leaf.origin = [b.origin[0] * s, b.origin[1] * s];
	}
	return bitmaps;
}

export function textureMegabytes(bitmaps: Iterable<Bitmap>): number {
	let bytes = 0;
	for (const { canvas } of bitmaps) bytes += canvas.width * canvas.height * 4;
	return bytes / 1048576;
}

// Caps the canvas backing store so large Retina screens stay within GPU memory.
export function renderResolution(v: Viewport, dpr: number): number {
	return Math.max(1, Math.min(dpr, Math.sqrt(MAX_RENDER_PIXELS / (v.width * v.height))));
}

// Where the canvas is capped below the screen's density (up to 2x, where they were tuned), the
// blurred kinds and far layers keep their share of its pixels.
export const blurScale = (resolution: number, dpr: number): number =>
	Math.min(1, resolution / Math.min(dpr, 2));

export function releaseBitmaps(bitmaps: Map<string, Bitmap>): void {
	for (const b of bitmaps.values()) b.canvas.width = 0;
}
