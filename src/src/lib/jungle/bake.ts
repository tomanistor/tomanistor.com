import { isFar, type Leaf } from './leaves';
import { DEG, type Viewport } from './layout';

type Point = [number, number];

export type Bitmap = {
	canvas: HTMLCanvasElement;
	cssPerPx: number;
	box: Point;
	origin: Point;
};

const SHADOW_PAD = 0.12;
const MAX_CANVAS = 2200;

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	return canvas.getContext('2d')!;
}

// Cropped, shaded by depth, with its drop shadow and focus drawn in. Out-of-focus leaves are baked
// at low resolution, since the blur hides it; the far layers get their blur as a whole, later.
function bake(leaf: Leaf, cssPerPx: number, img: HTMLImageElement, dpr: number): Bitmap {
	const { crop, base, coordWidth } = leaf.sprite;
	const [x, y, w, h] = crop;
	const k = img.naturalWidth / coordWidth;
	const kind = isFar(leaf) ? 'far' : leaf.foreground ? 'fg' : 'mid';
	const depth = kind === 'mid' ? Math.round(leaf.depth * 3) / 3 : kind === 'fg' ? 1 : 0.1;
	const cssW = w * cssPerPx;
	const cssH = h * cssPerPx;
	const want = kind === 'fg' ? 0.5 : kind === 'far' ? 1 : Math.min(dpr, 1.5);
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
	const defocus = kind === 'fg' ? 7 : kind === 'far' ? 0 : Math.max(0, (0.35 - depth) / 0.35) * 1.5;
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
export function bakeAll(
	leaves: Leaf[],
	images: Map<string, HTMLImageElement>,
	dpr: number
): Map<string, Bitmap> {
	const largest = new Map<string, Leaf>();
	for (const leaf of leaves) {
		const prev = largest.get(leaf.key!);
		if (!prev || prev.cssPerPx! < leaf.cssPerPx!) largest.set(leaf.key!, leaf);
	}
	const bitmaps = new Map(
		[...largest].map(([key, leaf]) => [
			key,
			bake(leaf, leaf.cssPerPx!, images.get(leaf.sprite.src)!, dpr)
		])
	);
	for (const leaf of leaves) {
		const b = bitmaps.get(leaf.key!)!;
		const s = leaf.cssPerPx! / b.cssPerPx;
		leaf.box = [b.box[0] * s, b.box[1] * s];
		leaf.origin = [b.origin[0] * s, b.origin[1] * s];
	}
	return bitmaps;
}

// A far layer's leaves, fully parted, painted into a canvas half again the size of the screen so it
// still covers the edges while the camera starts pulled back. Painted sharp and soft, each blurred
// once here rather than on every frame; the scene cross-fades between them.
export function paintLayer(
	sharp: HTMLCanvasElement,
	soft: HTMLCanvasElement,
	group: Leaf[],
	bitmaps: Map<string, Bitmap>,
	v: Viewport,
	sharpRes: number,
	softRes: number,
	sharpBlur: number,
	softBlur: number
): void {
	const full = document.createElement('canvas');
	full.width = Math.round(v.width * 1.5 * sharpRes);
	full.height = Math.round(v.height * 1.5 * sharpRes);
	const ctx = context(full);
	ctx.setTransform(sharpRes, 0, 0, sharpRes, v.width * 0.75 * sharpRes, v.height * 0.75 * sharpRes);
	for (const leaf of group) {
		ctx.save();
		ctx.translate(
			leaf.anchor![0] + leaf.n![0] * leaf.pull!,
			leaf.anchor![1] + leaf.n![1] * leaf.pull!
		);
		ctx.rotate((leaf.rot0! + leaf.swing) / DEG);
		ctx.scale(leaf.flip, 1);
		ctx.drawImage(
			bitmaps.get(leaf.key!)!.canvas,
			-leaf.origin![0],
			-leaf.origin![1],
			leaf.box![0],
			leaf.box![1]
		);
		ctx.restore();
	}
	for (const [canvas, res, blur] of [
		[sharp, sharpRes, sharpBlur],
		[soft, softRes, softBlur]
	] as const) {
		canvas.width = Math.round(v.width * 1.5 * res);
		canvas.height = Math.round(v.height * 1.5 * res);
		const c = context(canvas);
		c.filter = `blur(${(blur * res).toFixed(2)}px)`;
		c.drawImage(full, 0, 0, canvas.width, canvas.height);
	}
	full.width = 0;
}

export function canvasToObjectUrl(canvas: HTMLCanvasElement, name: string): Promise<string> {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error(`Could not encode ${name}`))),
			'image/webp',
			0.9
		)
	);
}

export async function toObjectUrls(
	keys: string[],
	bitmaps: Map<string, Bitmap>
): Promise<Map<string, string>> {
	const urls = await Promise.all(
		keys.map((key) => canvasToObjectUrl(bitmaps.get(key)!.canvas, key))
	);
	return new Map(keys.map((key, i) => [key, urls[i]]));
}

export function bitmapMegabytes(keys: string[], bitmaps: Map<string, Bitmap>): number {
	const bytes = keys.reduce((sum, key) => {
		const { canvas } = bitmaps.get(key)!;
		return sum + canvas.width * canvas.height * 4;
	}, 0);
	return Math.round(bytes / 1048576);
}

export function releaseBitmaps(bitmaps: Map<string, Bitmap>): void {
	for (const b of bitmaps.values()) b.canvas.width = 0;
}
