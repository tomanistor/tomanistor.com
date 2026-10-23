import {
	bakeAll,
	bitmapMegabytes,
	canvasToObjectUrl,
	paintLayer,
	releaseBitmaps,
	toObjectUrls
} from './bake';
import { BACK_DIST, DEEP_DIST, LOGO_DIST, parallaxAt, smoothstep, zoomAt } from './camera';
import { densityFor, generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves, shadeGradient, type Viewport } from './layout';
import { leafTarget, outwardSweep, scrollFraction, spring, stepLeaf } from './motion';
import { SPRITES } from './sprites';

export type SceneElements = {
	stage: HTMLElement;
	logo: HTMLElement;
	shade: HTMLElement;
	deepSharp: HTMLImageElement;
	deepSoft: HTMLImageElement;
	backSharp: HTMLImageElement;
	backSoft: HTMLImageElement;
};

const SEED = 11;
const LEAF_CLASS =
	'pointer-events-none absolute left-0 top-0 max-w-none select-none will-change-transform';

export function createJungleScene(els: SceneElements): { ready: Promise<void>; destroy(): void } {
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const coarsePointer = matchMedia('(pointer: coarse)');
	// The stage is sized from the large viewport, so phone toolbars don't change the scene's size.
	const measure = (): Viewport => ({
		width: els.stage.clientWidth,
		height: els.stage.clientHeight
	});

	let viewport = measure();
	let leaves = generateLeaves(SEED, densityFor(viewport.width, viewport.height));
	let live: Leaf[] = [];
	let images = new Map<string, HTMLImageElement>();
	const elements = new Map<Leaf, HTMLImageElement>();
	const lastStyle = new WeakMap<HTMLElement, Map<string, string>>();
	let urls: string[] = [];
	let destroyed = false;
	let frameId = 0;
	let resizeTimer: ReturnType<typeof setTimeout> | undefined;

	const camera = { t: 0, v: 0 };
	const look = { x: { t: 0, v: 0 }, y: { t: 0, v: 0 } };
	const pointer = { x: 0, y: 0 };
	let pointerPx: { x: number; y: number } | null = null;
	let lastPointerPx: { x: number; y: number } | null = null;

	function setStyle(el: HTMLElement, prop: 'transform' | 'opacity', value: string) {
		const cache = lastStyle.get(el) ?? new Map<string, string>();
		if (cache.get(prop) === value) return;
		cache.set(prop, value);
		lastStyle.set(el, cache);
		el.style[prop] = value;
	}

	const scroll = () => scrollFraction(scrollY, document.documentElement.scrollHeight, innerHeight);

	// Geometry the frame loop reads; a rebuild computes new values off to the side and swaps them in
	// together with the new images, so leaves never draw new positions with old image offsets.
	const GEOMETRY = [
		'anchor',
		'n',
		'pull',
		'dir0',
		'len',
		'rot0',
		'cssPerPx',
		'key',
		'box',
		'origin'
	] as const;
	const snapshot = () => leaves.map((leaf) => GEOMETRY.map((k) => leaf[k]));
	const restore = (saved: ReturnType<typeof snapshot>) =>
		leaves.forEach((leaf, i) =>
			GEOMETRY.forEach((k, j) => ((leaf as Record<string, unknown>)[k] = saved[i][j]))
		);

	let generation = 0;
	let running = false;
	async function relayout() {
		const run = ++generation;
		const next = measure();
		const current = snapshot();
		layoutLeaves(leaves, next);
		const bitmaps = bakeAll(leaves, images, devicePixelRatio || 1);
		const liveKeys = [...new Set(live.map((l) => l.key!))];
		// The far layers are painted on hidden canvases and shown as images: Chrome drops canvas
		// contents in background tabs and is slow to restore them, which flashed white on return.
		const canvases = Array.from({ length: 4 }, () => document.createElement('canvas'));
		const [deepSharp, deepSoft, backSharp, backSoft] = canvases;
		paintLayer(
			deepSharp,
			deepSoft,
			leaves.filter((l) => l.role === 'deep'),
			bitmaps,
			next,
			0.75,
			0.35,
			1.2,
			3
		);
		paintLayer(
			backSharp,
			backSoft,
			leaves.filter((l) => l.role === 'backing'),
			bitmaps,
			next,
			1,
			0.5,
			0.5,
			1.6
		);
		const memoryMb =
			bitmapMegabytes(liveKeys, bitmaps) +
			Math.round(canvases.reduce((sum, c) => sum + c.width * c.height * 4, 0) / 1048576);
		const target = snapshot();
		restore(current);

		const [byKey, layerUrls] = await Promise.all([
			toObjectUrls(liveKeys, bitmaps),
			Promise.all(canvases.map((c, i) => canvasToObjectUrl(c, `layer ${i}`)))
		]);
		releaseBitmaps(bitmaps);
		for (const c of canvases) c.width = 0;
		const created = [...byKey.values(), ...layerUrls];
		// Decode before swapping, so nothing shows blank while its new image loads.
		await Promise.allSettled(
			created.map((url) => {
				const img = new Image();
				img.src = url;
				return img.decode();
			})
		);
		if (destroyed || run !== generation) {
			for (const url of created) URL.revokeObjectURL(url);
			return;
		}

		restore(target);
		viewport = next;
		els.stage.dataset.bitmapMb = String(memoryMb);
		for (const url of urls) URL.revokeObjectURL(url);
		urls = created;
		[els.deepSharp, els.deepSoft, els.backSharp, els.backSoft].forEach(
			(img, i) => (img.src = layerUrls[i])
		);
		for (const leaf of live) {
			const img = elements.get(leaf)!;
			img.src = byKey.get(leaf.key!)!;
			img.dataset.key = leaf.key;
			img.style.width = `${leaf.box![0]}px`;
			img.style.height = `${leaf.box![1]}px`;
			img.style.transformOrigin = `${leaf.origin![0]}px ${leaf.origin![1]}px`;
			lastStyle.delete(img);
		}
		els.shade.style.background = shadeGradient(viewport);
		// On a rebuild, draw the new layout now, in the same frame as the new images. The first
		// layout is drawn by start(), once the camera has been set to the current scroll.
		if (running) frame(performance.now(), false);
	}

	let last = performance.now();
	function frame(now: number, schedule = true) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		const s = scroll();
		const calm = reducedMotion.matches;
		// Everything glides without overshoot; leaves differ only in how quickly they follow.
		spring(camera, smoothstep(s), 16, 1, dt);
		spring(look.x, pointer.x, 6, 1, dt);
		spring(look.y, pointer.y, 6, 1, dt);
		const cam = camera.t;
		const vmin = Math.min(viewport.width, viewport.height);
		const shift = (dist: number) =>
			`translate(${(-look.x.t * parallaxAt(dist, vmin)).toFixed(1)}px, ${(-look.y.t * parallaxAt(dist, vmin)).toFixed(1)}px)`;

		const sweep = pointerPx
			? outwardSweep(lastPointerPx, pointerPx, viewport.width, viewport.height)
			: 0;
		lastPointerPx = pointerPx;

		const logoShift = parallaxAt(LOGO_DIST, vmin);
		setStyle(
			els.logo,
			'transform',
			`translate(calc(-50% + ${(-look.x.t * logoShift).toFixed(1)}px), calc(-50% + ${(-look.y.t * logoShift).toFixed(1)}px)) ` +
				`scale(${zoomAt(LOGO_DIST, cam).toFixed(4)})`
		);
		// Focus pull: the far layers sharpen as the camera moves in, by fading out their soft copy.
		for (const [layer, dist] of [
			[els.deepSharp, DEEP_DIST],
			[els.deepSoft, DEEP_DIST],
			[els.backSharp, BACK_DIST],
			[els.backSoft, BACK_DIST]
		] as const) {
			setStyle(layer, 'transform', `${shift(dist)} scale(${zoomAt(dist, cam).toFixed(4)})`);
		}
		const softness = (1 - cam).toFixed(3);
		setStyle(els.deepSoft, 'opacity', softness);
		setStyle(els.backSoft, 'opacity', softness);
		setStyle(els.shade, 'transform', `${shift(2)} scale(${zoomAt(2, cam).toFixed(4)})`);

		const input = {
			scroll: s,
			cam,
			time: now / 1000,
			look: { x: look.x.t, y: look.y.t },
			sweep,
			pointer: pointerPx,
			calm,
			...viewport
		};
		for (const leaf of live) setStyle(elements.get(leaf)!, 'transform', stepLeaf(leaf, input, dt));
		if (schedule) frameId = requestAnimationFrame((t) => frame(t));
	}

	function onPointerMove(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || reducedMotion.matches) return;
		pointer.x = (e.clientX / innerWidth) * 2 - 1;
		pointer.y = (e.clientY / innerHeight) * 2 - 1;
		pointerPx = { x: e.clientX, y: e.clientY };
	}

	function onResize() {
		const next = measure();
		// Browsers also fire resize when nothing changed, e.g. on returning to a tab.
		if (next.width === viewport.width && next.height === viewport.height) return;
		// On phones the toolbar showing or hiding changes only the height; rebuilding then would
		// stall the scroll it happens during.
		if (coarsePointer.matches && next.width === viewport.width) return;
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(relayout, 150);
	}

	async function start() {
		const srcs = [...new Set(SPRITES.map((s) => s.src))];
		const decoded = await Promise.allSettled(
			srcs.map((src) => {
				const img = new Image();
				img.src = src;
				return img.decode().then(() => [src, img] as const);
			})
		);
		images = new Map(decoded.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
		// A plant that fails to load is left out rather than holding up the whole scene.
		leaves = leaves.filter((l) => images.has(l.sprite.src));
		live = leaves.filter((l) => !isFar(l));
		for (const leaf of live) {
			const img = new Image();
			img.className = LEAF_CLASS;
			img.alt = '';
			img.draggable = false;
			elements.set(leaf, img);
		}
		els.stage.dataset.leaves = String(live.length);
		if (destroyed) return;

		await relayout();
		await Promise.allSettled([...elements.values()].map((img) => img.decode()));
		if (destroyed) return;
		live.forEach((leaf, i) => {
			const img = elements.get(leaf)!;
			img.style.zIndex = String(10 + i);
			els.stage.append(img);
		});
		const s = scroll();
		camera.t = smoothstep(s);
		for (const leaf of live) leaf.t = leafTarget(leaf, s);
		addEventListener('pointermove', onPointerMove);
		addEventListener('resize', onResize);
		await new Promise<void>((resolve) => {
			running = true;
			frameId = requestAnimationFrame((now) => {
				last = now;
				frame(now);
				resolve();
			});
		});
	}

	return {
		ready: start(),
		destroy() {
			destroyed = true;
			cancelAnimationFrame(frameId);
			clearTimeout(resizeTimer);
			removeEventListener('pointermove', onPointerMove);
			removeEventListener('resize', onResize);
			for (const img of elements.values()) img.remove();
			for (const url of urls) URL.revokeObjectURL(url);
		}
	};
}
