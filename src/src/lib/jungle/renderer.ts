import type { RenderTexture, Sprite, Texture } from 'pixi.js';
import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
import { textureMegabytes, type Bitmap } from './bake';
import { BACK_DIST, DEEP_DIST, LOGO_DIST, parallaxAt, zoomAt } from './camera';
import { isFar, type Leaf } from './leaves';
import { DEG, logoSafeZone, type Viewport } from './layout';
import type { LeafPose } from './motion';

export type DrawInput = { cam: number; look: { x: number; y: number }; poses: LeafPose[] };

export type JungleRenderer = {
	canvas: HTMLCanvasElement;
	// Replaces every texture and sprite for this layout in one go; draws nothing.
	build(leaves: Leaf[], bitmaps: Map<string, Bitmap>, v: Viewport, resolution: number): void;
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

const megabytes = (width: number, height: number) => (width * height * 4) / 1048576;

// Same ellipse as `shadeGradient`, drawn small; it is only ever a soft gradient.
function paintShade(v: Viewport): HTMLCanvasElement {
	const { safeW, safeH } = logoSafeZone(v);
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

function paintLogo(img: HTMLImageElement, width: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width);
	canvas.height = Math.round((width * img.naturalHeight) / img.naturalWidth);
	canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export async function createJungleRenderer(): Promise<JungleRenderer> {
	const logoImg = new Image();
	logoImg.src = logoSrc;
	const [{ Application, BlurFilter, Container, RenderTexture, Sprite, Texture }] =
		await Promise.all([import('pixi.js'), logoImg.decode()]);
	const app = new Application();
	// The baked canvases are released once uploaded, so the GPU copy must never be collected.
	await app.init({
		autoStart: false,
		antialias: false,
		autoDensity: true,
		background: 0xffffff,
		gcActive: false
	});

	let owned: (Texture | RenderTexture)[] = [];
	let shade: Sprite;
	let logo: Sprite;
	let logoScale = 1;
	let far: { sprite: Sprite; dist: number; soft: boolean }[] = [];
	let leaves: { sprite: Sprite; box: [number, number] }[] = [];
	let viewport: Viewport = { width: 0, height: 0 };
	let textureMb = 0;

	// Uploads now, so the canvas can be released as soon as `build` returns.
	function upload(canvas: HTMLCanvasElement): Texture {
		const texture = Texture.from(canvas, true);
		app.renderer.texture.initSource(texture.source);
		owned.push(texture);
		return texture;
	}

	// A far layer's leaves, fully parted, rendered once into textures half again the size of the
	// screen, so they still cover the edges while the camera starts pulled back. Each copy is
	// blurred here rather than on every frame; `draw` cross-fades between them.
	function bakeLayer(
		group: Leaf[],
		bitmaps: Map<string, Bitmap>,
		v: Viewport,
		copies: readonly { res: number; blur: number }[]
	): RenderTexture[] {
		const layer = new Container();
		const textures = new Map<string, Texture>();
		for (const leaf of group) {
			const key = leaf.key!;
			if (!textures.has(key)) textures.set(key, Texture.from(bitmaps.get(key)!.canvas, true));
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
		const targets = copies.map(({ res, blur }) => {
			const target = RenderTexture.create({
				width: v.width * 1.5,
				height: v.height * 1.5,
				resolution: res
			});
			const filter = new BlurFilter({ strength: blur * res, quality: 2, resolution: res });
			layer.filters = [filter];
			app.renderer.render({ container: layer, target, clear: true });
			filter.destroy();
			owned.push(target);
			textureMb += megabytes(target.source.pixelWidth, target.source.pixelHeight);
			return target;
		});
		layer.destroy({ children: true });
		for (const texture of textures.values()) texture.destroy(true);
		return targets;
	}

	return {
		canvas: app.canvas,

		build(all, bitmaps, v, resolution) {
			for (const child of app.stage.removeChildren()) child.destroy();
			for (const texture of owned) texture.destroy(true);
			owned = [];
			viewport = v;
			app.renderer.resize(v.width, v.height, resolution);

			const shadeCanvas = paintShade(v);
			const logoW = Math.min(v.width * 0.5, v.height * 0.57);
			const logoCanvas = paintLogo(logoImg, logoW * resolution);
			shade = new Sprite(upload(shadeCanvas));
			logo = new Sprite(upload(logoCanvas));
			logoScale = logoW / logoCanvas.width;
			textureMb =
				megabytes(shadeCanvas.width, shadeCanvas.height) +
				megabytes(logoCanvas.width, logoCanvas.height);
			shadeCanvas.width = 0;
			logoCanvas.width = 0;
			shade.anchor.set(0.5);
			logo.anchor.set(0.5);
			app.stage.addChild(shade, logo);

			far = FAR.flatMap(({ role, dist, sharp, soft }) => {
				const group = all.filter((l) => l.role === role);
				const [sharpTexture, softTexture] = bakeLayer(group, bitmaps, v, [sharp, soft]);
				return [
					{ sprite: new Sprite(sharpTexture), dist, soft: false },
					{ sprite: new Sprite(softTexture), dist, soft: true }
				];
			});
			for (const { sprite } of far) {
				sprite.anchor.set(0.5);
				app.stage.addChild(sprite);
			}

			const live = all.filter((l) => !isFar(l));
			const liveBitmaps = new Map(live.map((l) => [l.key!, bitmaps.get(l.key!)!]));
			const textures = new Map([...liveBitmaps].map(([key, b]) => [key, upload(b.canvas)]));
			textureMb += textureMegabytes(liveBitmaps.values());
			leaves = live.map((leaf) => {
				const sprite = new Sprite(textures.get(leaf.key!)!);
				sprite.anchor.set(leaf.origin![0] / leaf.box![0], leaf.origin![1] / leaf.box![1]);
				app.stage.addChild(sprite);
				return { sprite, box: leaf.box! };
			});
		},

		draw({ cam, look, poses }) {
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
			place(logo, LOGO_DIST, logoScale);
			// Focus pull: the far layers sharpen as the camera moves in, by fading out their soft copy.
			for (const { sprite, dist, soft } of far) {
				place(sprite, dist, 1);
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

		gpuMegabytes: () => textureMb + megabytes(app.canvas.width, app.canvas.height),

		destroy() {
			app.destroy(true, { children: true });
			for (const texture of owned) texture.destroy(true);
		}
	};
}
