import type { Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
import { textureMegabytes, type Bitmap } from './bake';
import { BACK_DIST, DEEP_DIST, LOGO_DIST, parallaxAt, zoomAt } from './camera';
import { isFar, type Leaf } from './leaves';
import { archZone, DEG, openingZone, type Viewport } from './layout';
import { logoPose, logoWidth } from './phases';
import type { LeafPose } from './motion';
import { abandon, type Pace } from './pace';

export type DrawInput = {
	cam: number;
	open: number;
	look: { x: number; y: number };
	poses: LeafPose[];
};

export type JungleRenderer = {
	canvas: HTMLCanvasElement;
	// Prepares every texture and sprite for this layout in slices, while the current scene still
	// draws, then swaps them in at once; draws nothing. A build that `pace` stops leaves no trace.
	build(
		leaves: Leaf[],
		bitmaps: Map<string, Bitmap>,
		v: Viewport,
		resolution: number,
		blurScale: number,
		pace: Pace
	): Promise<void>;
	// `poses` are in the order of the live leaves (those not in a far layer).
	draw(input: DrawInput): void;
	gpuMegabytes(): number;
	destroy(): void;
};

const SHADE_RES = 0.25;
// Pixels per CSS pixel, and blur in CSS pixels, of each far layer's sharp and soft copy.
const FAR = [
	{ role: 'deep', dist: DEEP_DIST, sharp: { res: 0.5, blur: 1.2 }, soft: { res: 0.35, blur: 3 } },
	{
		role: 'backing',
		dist: BACK_DIST,
		sharp: { res: 0.75, blur: 0.5 },
		soft: { res: 0.5, blur: 1.6 }
	}
] as const;

type Scene = {
	root: Container;
	owned: (Texture | RenderTexture)[];
	shade: Sprite;
	archShade: Sprite;
	logo: Sprite;
	logoScale: number;
	far: { sprite: Sprite; dist: number; soft: boolean; drop: number }[];
	leaves: { sprite: Sprite; box: [number, number] }[];
	viewport: Viewport;
	textureMb: number;
};

const megabytes = (width: number, height: number) => (width * height * 4) / 1048576;

// Shadow under the foliage: clear around the logo, darkening toward the edges, so gaps between
// leaves read as depth rather than empty page. Drawn small; it is only ever a soft gradient.
function paintShade(v: Viewport): HTMLCanvasElement {
	const { safeW, safeH } = openingZone(v);
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(v.width * 1.8 * SHADE_RES);
	canvas.height = Math.round(v.height * 1.8 * SHADE_RES);
	const ctx = canvas.getContext('2d')!;
	const rx = safeW * 1.3 * SHADE_RES;
	const ry = safeH * 1.35 * SHADE_RES;
	ctx.setTransform(1, 0, 0, ry / rx, canvas.width / 2, canvas.height / 2);
	const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
	gradient.addColorStop(0.72, 'rgba(12, 36, 20, 0)');
	gradient.addColorStop(0.88, 'rgba(12, 36, 20, 0.25)');
	gradient.addColorStop(1, 'rgba(10, 30, 17, 0.45)');
	ctx.fillStyle = gradient;
	ctx.fillRect(
		-canvas.width,
		-canvas.height * (rx / ry),
		canvas.width * 2,
		canvas.height * 2 * (rx / ry)
	);
	return canvas;
}

// Clear inside `archZone`, then darkening with the oval's colour stops over a short distance.
async function paintArchShade(v: Viewport, pace: Pace): Promise<HTMLCanvasElement> {
	const { cy, half, rTop } = archZone(v);
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(v.width * 1.8 * SHADE_RES);
	canvas.height = Math.round(v.height * 1.8 * SHADE_RES);
	const ctx = canvas.getContext('2d')!;
	const image = ctx.createImageData(canvas.width, canvas.height);
	const fade = half * 0.3;
	for (let py = 0; py < canvas.height; py++) {
		await pace();
		const y = (py + 0.5 - canvas.height / 2) / SHADE_RES;
		for (let px = 0; px < canvas.width; px++) {
			const x = (px + 0.5 - canvas.width / 2) / SHADE_RES;
			const outside =
				y >= cy ? Math.abs(x) - half : (Math.hypot(x / half, (y - cy) / rTop) - 1) * half;
			const t = Math.min(Math.max(outside / fade, 0), 1);
			const i = (py * canvas.width + px) * 4;
			const deep = Math.max((t - 0.57) / 0.43, 0);
			image.data[i] = 12 - 2 * deep;
			image.data[i + 1] = 36 - 6 * deep;
			image.data[i + 2] = 20 - 3 * deep;
			image.data[i + 3] = (t < 0.57 ? (t / 0.57) * 0.25 : 0.25 + deep * 0.2) * 255;
		}
	}
	ctx.putImageData(image, 0, 0);
	return canvas;
}

function paintLogo(img: HTMLImageElement, width: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width);
	canvas.height = Math.round((width * img.naturalHeight) / img.naturalWidth);
	canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
	return canvas;
}

// Rejects if WebGL is unavailable. `onContextLost` fires once the canvas can no longer draw.
export async function createJungleRenderer(onContextLost: () => void): Promise<JungleRenderer> {
	const logoImg = new Image();
	logoImg.src = logoSrc;
	const [
		{ Application, BlurFilter, Container, RenderTexture, Sprite, Texture, TexturePool, Ticker }
	] = await Promise.all([import('pixi.js'), logoImg.decode()]);
	const app = new Application();
	// The baked canvases are released once uploaded, so the GPU copy must never be collected.
	await app
		.init({
			// Without WebGL, PixiJS would quietly fall back to another backend instead of rejecting.
			preference: ['webgl'],
			autoStart: false,
			antialias: false,
			autoDensity: true,
			background: 0xffffff,
			gcActive: false
		})
		.catch((error) => {
			// A renderer that fails partway through starting can't be destroyed, and would keep PixiJS's
			// global ticker requesting frames forever.
			Ticker.system.stop();
			throw error;
		});
	app.canvas.addEventListener('webglcontextlost', onContextLost);

	let scene: Scene | undefined;

	// Uploads now, so the canvas can be released as soon as `build` returns.
	function upload(canvas: HTMLCanvasElement, owned: Scene['owned']): Texture {
		const texture = Texture.from(canvas, true);
		app.renderer.texture.initSource(texture.source);
		owned.push(texture);
		return texture;
	}

	// A far layer's leaves, fully parted, rendered once into textures half again the size of the
	// screen, so they still cover the edges while the camera starts pulled back. Each copy is
	// blurred here rather than on every frame; `draw` cross-fades between them.
	async function bakeLayer(
		group: Leaf[],
		bitmaps: Map<string, Bitmap>,
		v: Viewport,
		copies: readonly { res: number; blur: number }[],
		scale: number,
		owned: Scene['owned'],
		pace: Pace
	): Promise<RenderTexture[]> {
		const layer = new Container();
		const textures = new Map<string, Texture>();
		const discard = () => {
			layer.destroy({ children: true });
			for (const texture of textures.values()) texture.destroy(true);
		};
		const targets: RenderTexture[] = [];
		try {
			for (const leaf of group) {
				const key = leaf.key!;
				if (!textures.has(key)) {
					await pace();
					const texture = Texture.from(bitmaps.get(key)!.canvas, true);
					textures.set(key, texture);
					app.renderer.texture.initSource(texture.source);
				}
				const sprite = new Sprite(textures.get(key)!);
				sprite.anchor.set(leaf.origin![0] / leaf.box![0], leaf.origin![1] / leaf.box![1]);
				sprite.position.set(
					v.width * 0.75 + leaf.anchor![0] + leaf.n![0] * leaf.pull!,
					v.height * 0.75 + leaf.anchor![1] + leaf.n![1] * leaf.pull!
				);
				sprite.rotation = (leaf.rot0! + leaf.swing) / DEG;
				sprite.scale.set(
					(leaf.flip * leaf.box![0]) / sprite.texture.width,
					leaf.box![1] / sprite.texture.height
				);
				layer.addChild(sprite);
			}
			for (const { res: base, blur } of copies) {
				await pace();
				const res = base * scale;
				const target = RenderTexture.create({
					width: v.width * 1.5,
					height: v.height * 1.5,
					resolution: res
				});
				owned.push(target);
				const filter = new BlurFilter({ strength: blur * res, quality: 2, resolution: res });
				layer.filters = [filter];
				app.renderer.render({ container: layer, target, clear: true });
				filter.destroy();
				targets.push(target);
			}
		} catch (error) {
			abandon(error, discard);
		}
		discard();
		return targets;
	}

	return {
		canvas: app.canvas,

		async build(all, bitmaps, v, resolution, blurScale, pace) {
			const owned: Scene['owned'] = [];
			const root = new Container();
			let staged: Scene;
			try {
				await pace();
				const shadeCanvas = paintShade(v);
				const shade = new Sprite(upload(shadeCanvas, owned));
				let textureMb = megabytes(shadeCanvas.width, shadeCanvas.height);
				shadeCanvas.width = 0;
				const archCanvas = await paintArchShade(v, pace);
				const archShade = new Sprite(upload(archCanvas, owned));
				textureMb += megabytes(archCanvas.width, archCanvas.height);
				archCanvas.width = 0;
				await pace();
				const logoW = logoWidth(v);
				const logoCanvas = paintLogo(logoImg, logoW * resolution);
				const logo = new Sprite(upload(logoCanvas, owned));
				const logoScale = logoW / logoCanvas.width;
				textureMb += megabytes(logoCanvas.width, logoCanvas.height);
				logoCanvas.width = 0;
				shade.anchor.set(0.5);
				archShade.anchor.set(0.5);
				logo.anchor.set(0.5);
				root.addChild(shade, archShade, logo);

				// Each far layer is baked in two parts: the leaves that stay, and those that drop out of
				// the arch together as it opens.
				const far: Scene['far'] = [];
				for (const { role, dist, sharp, soft } of FAR) {
					const group = all.filter((l) => l.role === role);
					const exiting = group.filter((l) => l.exit! > 0);
					const parts = [
						{ leaves: group.filter((l) => l.exit === 0), drop: 0 },
						{ leaves: exiting, drop: Math.max(0, ...exiting.map((l) => l.exit!)) }
					].filter((part) => part.leaves.length > 0);
					for (const { leaves, drop } of parts) {
						const copies = await bakeLayer(
							leaves,
							bitmaps,
							v,
							[sharp, soft],
							blurScale,
							owned,
							pace
						);
						for (const [i, texture] of copies.entries()) {
							textureMb += megabytes(texture.source.pixelWidth, texture.source.pixelHeight);
							const sprite = new Sprite(texture);
							sprite.anchor.set(0.5);
							root.addChild(sprite);
							far.push({ sprite, dist, soft: i === 1, drop });
						}
					}
				}
				// The blur passes leave scratch textures pooled; nothing filters again until the next build.
				TexturePool.clear(true);

				const live = all.filter((l) => !isFar(l));
				const liveBitmaps = new Map(live.map((l) => [l.key!, bitmaps.get(l.key!)!]));
				const textures = new Map<string, Texture>();
				for (const [key, b] of liveBitmaps) {
					await pace();
					textures.set(key, upload(b.canvas, owned));
				}
				textureMb += textureMegabytes(liveBitmaps.values());
				const leaves = live.map((leaf) => {
					const sprite = new Sprite(textures.get(leaf.key!)!);
					sprite.anchor.set(leaf.origin![0] / leaf.box![0], leaf.origin![1] / leaf.box![1]);
					root.addChild(sprite);
					return { sprite, box: leaf.box! };
				});
				staged = {
					root,
					owned,
					shade,
					archShade,
					logo,
					logoScale,
					far,
					leaves,
					viewport: v,
					textureMb
				};
			} catch (error) {
				abandon(error, () => {
					root.destroy({ children: true });
					for (const texture of owned) texture.destroy(true);
					TexturePool.clear(true);
				});
			}

			// Swapped in the same slice as the last check, so no frame draws a half-built scene. Past
			// here the new scene is live, so nothing that fails may tear it down.
			const old = scene;
			scene = staged;
			app.renderer.resize(v.width, v.height, resolution);
			app.stage.addChild(root);
			if (old) {
				old.root.destroy({ children: true });
				for (const texture of old.owned) texture.destroy(true);
			}
		},

		draw({ cam, open, look, poses }) {
			const { shade, archShade, logo, logoScale, far, leaves, viewport } = scene!;
			const vmin = Math.min(viewport.width, viewport.height);
			const place = (sprite: Sprite, dist: number, scale: number) => {
				const shift = parallaxAt(dist, vmin);
				sprite.position.set(
					viewport.width / 2 - look.x * shift,
					viewport.height / 2 - look.y * shift
				);
				sprite.scale.set(zoomAt(dist, cam) * scale);
			};
			place(shade, 2, 1 / SHADE_RES);
			place(archShade, 2, 1 / SHADE_RES);
			shade.alpha = 1 - open;
			archShade.alpha = open;
			const pose = logoPose(cam, open, viewport);
			place(logo, LOGO_DIST, 1);
			logo.y += pose.dy;
			logo.scale.set(pose.scale * logoScale);
			// Focus pull: the far layers sharpen as the camera moves in, by fading out their soft copy.
			for (const { sprite, dist, soft, drop } of far) {
				place(sprite, dist, 1);
				sprite.y += open * drop * zoomAt(dist, cam);
				if (soft) sprite.alpha = 1 - cam;
			}
			poses.forEach((pose, i) => {
				const { sprite, box } = leaves[i];
				sprite.position.set(pose.x, pose.y);
				sprite.rotation = pose.rotation / DEG;
				sprite.scale.set(
					(pose.scaleX * box[0]) / sprite.texture.width,
					(pose.scaleY * box[1]) / sprite.texture.height
				);
			});
			app.render();
		},

		gpuMegabytes: () => (scene?.textureMb ?? 0) + megabytes(app.canvas.width, app.canvas.height),

		destroy() {
			// PixiJS loses the context itself while tearing down.
			app.canvas.removeEventListener('webglcontextlost', onContextLost);
			app.destroy(true, { children: true });
			for (const texture of scene?.owned ?? []) texture.destroy(true);
		}
	};
}
