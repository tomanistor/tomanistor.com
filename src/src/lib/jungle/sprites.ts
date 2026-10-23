import monsteraSheet from '$lib/assets/jungle/monstera-sheet.webp';
import ladyPalm from '$lib/assets/jungle/lady-palm.webp';
import fanPalm from '$lib/assets/jungle/fan-palm.webp';
import leafyBush from '$lib/assets/jungle/leafy-bush.webp';
import fern from '$lib/assets/jungle/fern.webp';
import monsteraDark from '$lib/assets/jungle/monstera-dark.webp';
import monsteraStem from '$lib/assets/jungle/monstera-stem.webp';
import bananaLeaf from '$lib/assets/jungle/banana-leaf.webp';
import ribbedLeaf from '$lib/assets/jungle/ribbed-leaf.webp';
import type { Role } from './leaves';

type Point = [number, number];

// Coordinates are in each original image's pixels (`coordWidth` wide); the shipped files are
// downsized, so they are scaled by `naturalWidth / coordWidth` when drawn. `base` is where the blade
// meets its stem, `tip` the far end of its midrib, and `stemEnd` marks a plant with a visible stem,
// which may only grow from off-screen. `size` is the plant's natural midrib length relative to a
// monstera; `hi` marks photos sharp enough for near layers.
export type Sprite = {
	src: string;
	coordWidth: number;
	crop: [number, number, number, number];
	base: Point;
	tip: Point;
	stemEnd?: Point;
	size: number;
	weight: number;
	hi?: boolean;
};

const sheet = (s: Omit<Sprite, 'src' | 'coordWidth' | 'size' | 'weight'>): Sprite => ({
	src: monsteraSheet,
	coordWidth: 2000,
	size: 0.9,
	weight: 1,
	...s
});

const plant = (s: Omit<Sprite, 'coordWidth' | 'hi'>): Sprite => ({
	coordWidth: 1800,
	hi: true,
	...s
});

export const SPRITES: readonly Sprite[] = [
	sheet({ crop: [50, 75, 540, 555], base: [260, 468], tip: [303, 52] }),
	sheet({ crop: [640, 50, 645, 585], base: [439, 219], tip: [46, 466], stemEnd: [612, 484] }),
	sheet({ crop: [1380, 70, 540, 560], base: [324, 131], tip: [228, 525], stemEnd: [457, 62] }),
	sheet({ crop: [75, 680, 520, 645], base: [252, 427], tip: [252, 24], stemEnd: [232, 609] }),
	sheet({ crop: [660, 625, 640, 700], base: [252, 442], tip: [536, 26], stemEnd: [120, 672] }),
	sheet({ crop: [1330, 720, 600, 600], base: [343, 173], tip: [253, 501] }),
	sheet({ crop: [80, 1415, 495, 500], base: [258, 306], tip: [250, 38] }),
	sheet({ crop: [670, 1330, 720, 660], base: [340, 421], tip: [340, 29], stemEnd: [326, 596] }),
	sheet({ crop: [1430, 1410, 490, 575], base: [233, 402], tip: [269, 43] }),
	plant({
		src: ladyPalm,
		crop: [0, 94, 1798, 1704],
		base: [847, 862],
		tip: [1335, 230],
		stemEnd: [197, 1700],
		size: 0.75,
		weight: 1.3
	}),
	plant({
		src: fanPalm,
		crop: [146, 46, 1508, 1378],
		base: [764, 950],
		tip: [764, 21],
		stemEnd: [764, 1378],
		size: 0.85,
		weight: 1.3
	}),
	// Seen from above; its stems meet under the leaves.
	plant({
		src: leafyBush,
		crop: [348, 60, 1104, 1080],
		base: [500, 575],
		tip: [560, 40],
		size: 0.8,
		weight: 1
	}),
	plant({
		src: fern,
		crop: [130, 172, 1506, 1514],
		base: [930, 1186],
		tip: [702, 41],
		stemEnd: [992, 1508],
		size: 1,
		weight: 1.3
	}),
	plant({
		src: monsteraDark,
		crop: [70, 94, 1658, 1612],
		base: [841, 341],
		tip: [591, 1591],
		size: 1,
		weight: 2
	}),
	plant({
		src: monsteraStem,
		crop: [372, 136, 1054, 1508],
		base: [535, 1069],
		tip: [393, 16],
		stemEnd: [550, 1508],
		size: 1,
		weight: 2
	}),
	plant({
		src: bananaLeaf,
		crop: [326, 96, 1304, 1596],
		base: [196, 1330],
		tip: [1300, 16],
		stemEnd: [70, 1590],
		size: 1.3,
		weight: 1.5
	}),
	plant({
		src: ribbedLeaf,
		crop: [430, 75, 890, 1575],
		base: [413, 1397],
		tip: [586, 13],
		stemEnd: [353, 1551],
		size: 0.8,
		weight: 1.5
	})
];

// Near layers are drawn large, so they only use the high-resolution photos. Leaves set inside the
// scene would show their stems, so they only use plants without one.
export function pickSprite(rand: () => number, depth: number, role: Role): Sprite {
	const inside = role === 'core' || role === 'deep';
	const pool = SPRITES.filter(
		(s) => (s.hi || (role !== 'foreground' && depth < 0.55)) && !(inside && s.stemEnd)
	);
	let r = rand() * pool.reduce((sum, s) => sum + s.weight, 0);
	return pool.find((s) => (r -= s.weight) < 0) ?? pool[pool.length - 1];
}
