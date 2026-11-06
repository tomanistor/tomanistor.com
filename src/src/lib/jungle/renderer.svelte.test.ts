import { Container, TexturePool } from 'pixi.js';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { bakeAll } from './bake';
import { densityFor, generateLeaves, isFar, type Leaf } from './leaves';
import { layoutLeaves } from './layout';
import { Stale, type Pace } from './pace';
import { createJungleRenderer, type JungleRenderer } from './renderer';
import { SPRITES } from './sprites';

const v = { width: 480, height: 320 };
const always: Pace = async () => {};
let images: Map<string, HTMLImageElement>;
let leaves: Leaf[];
let renderer: JungleRenderer | undefined;

// Stops the build at its `n`th yield point with `error`.
function stopAt(n: number, error: Error): Pace {
	let calls = 0;
	return async () => {
		if (++calls === n) throw error;
	};
}

const build = async (pace: Pace) =>
	renderer!.build(leaves, await bakeAll(leaves, images, 1, 1), v, 1, 1, pace);

beforeAll(async () => {
	images = new Map(
		[...new Set(SPRITES.map((s) => s.src))].map((src) => {
			const img = new Image();
			img.src = src;
			return [src, img];
		})
	);
	await Promise.all([...images.values()].map((img) => img.decode()));
	leaves = generateLeaves(11, densityFor(v.width, v.height));
	layoutLeaves(leaves, v);
});

afterEach(() => {
	vi.restoreAllMocks();
	renderer?.destroy();
	renderer = undefined;
});

describe('renderer.build', () => {
	it('a stopped build still exits as Stale when its cleanup throws', async () => {
		renderer = await createJungleRenderer(() => {});
		vi.spyOn(TexturePool, 'clear').mockImplementation(() => {
			throw new Error('cleanup');
		});
		await expect(build(stopAt(3, new Stale()))).rejects.toBeInstanceOf(Stale);
	});

	it('frees the blur scratch textures without destroying one still bound to a shader', async () => {
		renderer = await createJungleRenderer(() => {});
		const warn = vi.spyOn(console, 'warn');
		await build(always);
		await build(always);
		expect(warn.mock.calls.flat().join('\n')).not.toContain('destroyed while still bound');
	});

	it('a failed build reports its own error, not one from its cleanup', async () => {
		renderer = await createJungleRenderer(() => {});
		vi.spyOn(TexturePool, 'clear').mockImplementation(() => {
			throw new Error('cleanup');
		});
		await expect(build(stopAt(3, new Error('first')))).rejects.toThrow('first');
	});

	it('keeps the new scene when tearing down the old one throws', async () => {
		renderer = await createJungleRenderer(() => {});
		await build(always);
		let added: Container | undefined;
		let swapped: Container | undefined;
		const addChild = Container.prototype.addChild;
		vi.spyOn(Container.prototype, 'addChild').mockImplementation(function (
			this: Container,
			...children
		) {
			added = children[0] as Container;
			return addChild.apply(this, children);
		});
		const destroy = Container.prototype.destroy;
		vi.spyOn(Container.prototype, 'destroy').mockImplementation(function (this: Container, o) {
			// Only the old scene's root sits on the stage with children of its own.
			if (!swapped && this.parent && this.children.length > 0) {
				swapped = added;
				throw new Error('teardown');
			}
			destroy.call(this, o);
		});
		await expect(build(always)).rejects.toThrow('teardown');
		expect(swapped).toBeDefined();
		expect(swapped!.destroyed).toBe(false);
	});

	it('frees each bitmap once it is on the GPU, the far layers’ before any live leaf’s', async () => {
		renderer = await createJungleRenderer(() => {});
		const bitmaps = await bakeAll(leaves, images, 1, 1);
		const of = (far: boolean) =>
			leaves.filter((l) => isFar(l) === far).map((l) => bitmaps.get(l.key!)!);
		const [far, live] = [of(true), of(false)];
		let farHeld = false;
		const pace: Pace = async () => {
			if (live.some((b) => b.canvas.width === 0) && far.some((b) => b.canvas.width > 0))
				farHeld = true;
		};
		await renderer.build(leaves, bitmaps, v, 1, 1, pace);
		expect(farHeld).toBe(false);
		expect([...bitmaps.values()].every((b) => b.canvas.width === 0)).toBe(true);
	});
});
