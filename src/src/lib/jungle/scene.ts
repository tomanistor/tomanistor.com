import { bakeAll, releaseBitmaps, renderResolution } from './bake';
import { densityFor, generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves, type Viewport } from './layout';
import { camAt, logoPose, openAt, titleLayout, titlePose } from './phases';
import { leafPose, leafTarget, outwardSweep, scrollFraction, spring } from './motion';
import { createJungleRenderer, type JungleRenderer } from './renderer';
import { SPRITES } from './sprites';

export type SceneElements = {
	stage: HTMLElement;
	fallbackLogo: HTMLImageElement;
	title: HTMLElement;
};

const SEED = 11;

export function createJungleScene(els: SceneElements): { ready: Promise<void>; destroy(): void } {
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const coarsePointer = matchMedia('(pointer: coarse)');
	// The stage is sized from the large viewport, so phone toolbars don't change the scene's size.
	const measure = (): Viewport => ({
		width: els.stage.clientWidth,
		height: els.stage.clientHeight
	});

	let viewport = measure();
	let dpr = devicePixelRatio || 1;
	let leaves = generateLeaves(SEED, densityFor(viewport.width, viewport.height));
	let live: Leaf[] = [];
	let images = new Map<string, HTMLImageElement>();
	let renderer: JungleRenderer | undefined;
	let destroyed = false;
	let frameId = 0;
	let resizeTimer: ReturnType<typeof setTimeout> | undefined;
	let generation = 0;
	let resolveReady!: () => void;
	const ready = new Promise<void>((resolve) => (resolveReady = resolve));

	const camera = { t: 0, v: 0 };
	const opening = { t: 0, v: 0 };
	const look = { x: { t: 0, v: 0 }, y: { t: 0, v: 0 } };
	const pointer = { x: 0, y: 0 };
	let pointerPx: { x: number; y: number } | null = null;
	let lastPointerPx: { x: number; y: number } | null = null;

	const scroll = () => scrollFraction(scrollY, document.documentElement.scrollHeight, innerHeight);

	// Lays out, bakes and uploads in one go, so the next frame draws new positions with new textures.
	function build() {
		viewport = measure();
		dpr = devicePixelRatio || 1;
		layoutLeaves(leaves, viewport);
		const resolution = renderResolution(viewport, dpr);
		const bitmaps = bakeAll(leaves, images, resolution);
		renderer!.build(leaves, bitmaps, viewport, resolution);
		els.title.style.fontSize = `${titleLayout(viewport).fontSize}px`;
		releaseBitmaps(bitmaps);
		els.stage.dataset.gpuMb = String(Math.round(renderer!.gpuMegabytes()));
		els.stage.dataset.generation = String(++generation);
	}

	function placeTitle(open: number) {
		const { y, opacity } = titlePose(open, viewport, reducedMotion.matches);
		els.title.style.transform = `translateY(${Math.round(y * 10) / 10}px)`;
		els.title.style.opacity = String(Math.round(opacity * 1000) / 1000);
	}

	let last = performance.now();
	function frame(now: number, schedule = true) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		const s = scroll();
		// Everything glides without overshoot; leaves differ only in how quickly they follow.
		spring(camera, camAt(s), 16, 1, dt);
		spring(opening, openAt(s), 16, 1, dt);
		spring(look.x, pointer.x, 6, 1, dt);
		spring(look.y, pointer.y, 6, 1, dt);

		const sweep = pointerPx
			? outwardSweep(lastPointerPx, pointerPx, viewport.width, viewport.height)
			: 0;
		lastPointerPx = pointerPx;

		const input = {
			scroll: s,
			cam: camera.t,
			open: opening.t,
			time: now / 1000,
			look: { x: look.x.t, y: look.y.t },
			sweep,
			pointer: pointerPx,
			calm: reducedMotion.matches,
			...viewport
		};
		const poses = live.map((leaf) => leafPose(leaf, input, dt));
		renderer!.draw({ cam: camera.t, open: opening.t, look: input.look, poses });
		const openCss = String(Math.round(opening.t * 1000) / 1000);
		if (els.stage.style.getPropertyValue('--open') !== openCss)
			els.stage.style.setProperty('--open', openCss);
		placeTitle(opening.t);
		const drawn = String(poses.length);
		if (els.stage.dataset.drawn !== drawn) els.stage.dataset.drawn = drawn;
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
		const sameDpr = (devicePixelRatio || 1) === dpr;
		// Browsers also fire resize when nothing changed, e.g. on returning to a tab.
		if (next.width === viewport.width && next.height === viewport.height && sameDpr) return;
		// On phones the toolbar showing or hiding changes only the height; rebuilding then would
		// stall the scroll it happens during.
		if (coarsePointer.matches && next.width === viewport.width && sameDpr) return;
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			if (!renderer) return;
			try {
				build();
				frame(performance.now(), false);
			} catch (error) {
				fallBack(error);
			}
		}, 150);
	}

	// Puts a new renderer's canvas on the stage and starts drawing.
	function show(created: JungleRenderer) {
		renderer = created;
		build();
		created.canvas.className = 'pointer-events-none absolute left-0 top-0 z-0';
		created.canvas.setAttribute('aria-hidden', 'true');
		els.stage.prepend(created.canvas);
		els.stage.dataset.renderer = 'webgl';
		frameId = requestAnimationFrame((now) => {
			last = now;
			frame(now);
			resolveReady();
		});
	}

	// Redraws from the kept images in a new canvas; the leaves keep their layout and motion.
	function onContextLost() {
		cancelAnimationFrame(frameId);
		renderer?.destroy();
		renderer = undefined;
		els.stage.dataset.renderer = 'recovering';
		createJungleRenderer(onContextLost)
			.then((created) => (destroyed ? created.destroy() : show(created)))
			.catch(fallBack);
	}

	// The page is never left blank: anything that stops the scene drawing shows a plain logo.
	function fallBack(error: unknown) {
		console.error('Jungle scene failed to start', error);
		cancelAnimationFrame(frameId);
		renderer?.destroy();
		renderer = undefined;
		if (destroyed) return;
		placeFallback();
		addEventListener('scroll', placeFallback, { passive: true });
		addEventListener('resize', placeFallback);
		els.fallbackLogo.hidden = false;
		els.stage.dataset.renderer = 'fallback';
		resolveReady();
	}

	// Follows the scroll with the same poses as the scene, so it matches the loader at the hand-off.
	function placeFallback() {
		viewport = measure();
		const s = scroll();
		const { scale, dy } = logoPose(camAt(s), openAt(s), viewport);
		els.fallbackLogo.style.transform = `translateY(${dy}px) scale(${scale})`;
		els.title.style.fontSize = `${titleLayout(viewport).fontSize}px`;
		placeTitle(openAt(s));
	}

	async function start() {
		const srcs = [...new Set(SPRITES.map((s) => s.src))];
		const [decoded, created] = await Promise.all([
			Promise.allSettled(
				srcs.map((src) => {
					const img = new Image();
					img.src = src;
					return img.decode().then(() => [src, img] as const);
				})
			),
			createJungleRenderer(onContextLost)
		]);
		if (destroyed) return created.destroy();
		images = new Map(decoded.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
		// A plant that fails to load is left out rather than holding up the whole scene.
		leaves = leaves.filter((l) => images.has(l.sprite.src));
		live = leaves.filter((l) => !isFar(l));
		els.stage.dataset.leaves = String(live.length);

		show(created);
		const s = scroll();
		camera.t = camAt(s);
		opening.t = openAt(s);
		for (const leaf of live) leaf.t = leafTarget(leaf, s);
		addEventListener('pointermove', onPointerMove);
		addEventListener('resize', onResize);
	}

	start().catch(fallBack);
	return {
		ready,
		destroy() {
			destroyed = true;
			resolveReady();
			cancelAnimationFrame(frameId);
			clearTimeout(resizeTimer);
			removeEventListener('pointermove', onPointerMove);
			removeEventListener('resize', onResize);
			removeEventListener('scroll', placeFallback);
			removeEventListener('resize', placeFallback);
			renderer?.destroy();
		}
	};
}
