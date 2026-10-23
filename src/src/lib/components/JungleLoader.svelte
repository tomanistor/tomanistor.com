<script lang="ts">
	import { onMount } from 'svelte';
	import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
	import { LOGO_DIST, smoothstep, zoomAt } from '$lib/jungle/camera';
	import { scrollFraction } from '$lib/jungle/motion';

	let { done }: { done: boolean } = $props();

	type Axis = 'X' | 'Y';
	// The logo is only ever drawn inside a window, so the unfilled part simply isn't there. Each
	// edge is a clipping box that starts slid in from one side while its child counter-moves, keeping
	// the logo still. They open from a line through the centre: up and down into a column 20% wide,
	// then out to both sides. Start positions are rendered on the server so nothing flashes.
	const EDGES: { axis: Axis; from: number; spread: boolean }[] = [
		{ axis: 'Y', from: 50, spread: false },
		{ axis: 'Y', from: -50, spread: false },
		{ axis: 'X', from: 40, spread: true },
		{ axis: 'X', from: -40, spread: true }
	];
	const OPEN = {
		delay: 200,
		duration: 1000,
		easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
		fill: 'both'
	} as const;
	const SPREAD = { ...OPEN, delay: 1150, duration: 900 } as const;
	const slide = (axis: Axis, amount: number) => `translate${axis}(${amount}%)`;
	const windowClass = 'absolute inset-0 will-change-transform';

	const edgeEls: HTMLElement[] = [];
	let filled = $state(false);
	let fading = $state(false);
	let visible = $state(true);
	let logoTransform = $state(`translate(-50%, -50%) scale(${zoomAt(LOGO_DIST, 0).toFixed(4)})`);

	onMount(() => {
		// Track the scene logo's size at the current scroll, including a restored position or a
		// visitor scrolling while it loads, so the hand-off doesn't jump.
		const syncLogo = () => {
			const s = scrollFraction(scrollY, document.documentElement.scrollHeight, innerHeight);
			logoTransform = `translate(-50%, -50%) scale(${zoomAt(LOGO_DIST, smoothstep(s)).toFixed(4)})`;
		};
		syncLogo();
		addEventListener('scroll', syncLogo, { passive: true });

		const animations = EDGES.map(({ axis, from, spread }, i) => {
			const timing = spread ? SPREAD : OPEN;
			const edge = edgeEls[i];
			(edge.firstElementChild as HTMLElement).animate(
				[{ transform: slide(axis, -from) }, { transform: slide(axis, 0) }],
				timing
			);
			return edge.animate(
				[{ transform: slide(axis, from) }, { transform: slide(axis, 0) }],
				timing
			);
		});
		animations[animations.length - 1].finished.then(() => (filled = true));
		return () => removeEventListener('scroll', syncLogo);
	});

	// Lift the cover only once the logo is full and the scene is ready, so nothing moves at the hand-off.
	$effect(() => {
		if (done && filled) requestAnimationFrame(() => (fading = true));
	});
</script>

{#snippet edge(i: number, inner: import('svelte').Snippet)}
	{@const { axis, from } = EDGES[i]}
	<div
		bind:this={edgeEls[i]}
		data-edge
		class="{windowClass} overflow-hidden"
		style:transform={slide(axis, from)}
	>
		<div class={windowClass} style:transform={slide(axis, -from)}>
			{@render inner()}
		</div>
	</div>
{/snippet}

{#if visible}
	<div
		data-jungle-loader
		aria-hidden="true"
		class="fixed inset-0 z-[2000] bg-white transition-opacity duration-[900ms] {fading
			? 'pointer-events-none opacity-0'
			: ''}"
		ontransitionend={(e) => e.target === e.currentTarget && (visible = false)}
	>
		<div
			data-logo-box
			class="absolute left-1/2 top-1/2 aspect-[225/197] w-[min(50vw,57vh)] overflow-hidden"
			style:transform={logoTransform}
		>
			{#snippet logo()}
				<img src={logoSrc} alt="" class="absolute inset-0 h-full w-full" />
			{/snippet}
			{#snippet right()}{@render edge(3, logo)}{/snippet}
			{#snippet left()}{@render edge(2, right)}{/snippet}
			{#snippet bottom()}{@render edge(1, left)}{/snippet}
			{@render edge(0, bottom)}
		</div>
	</div>
{/if}
