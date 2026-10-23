<script lang="ts">
	import { onMount } from 'svelte';
	import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
	import { LOGO_DIST, zoomAt } from '$lib/jungle/camera';
	import { createJungleScene } from '$lib/jungle/scene';

	let { onready }: { onready?: () => void } = $props();

	let stage: HTMLElement;
	let logo: HTMLElement;
	let shade: HTMLElement;
	let deepSharp: HTMLCanvasElement;
	let deepSoft: HTMLCanvasElement;
	let backSharp: HTMLCanvasElement;
	let backSoft: HTMLCanvasElement;

	// The logo's size at the top of the page, before the scene takes over its transform.
	const startTransform = `translate(-50%, -50%) scale(${zoomAt(LOGO_DIST, 0).toFixed(4)})`;
	const layerClass =
		'pointer-events-none absolute -left-1/4 -top-1/4 h-[150%] w-[150%] will-change-transform';

	onMount(() => {
		const scene = createJungleScene({
			stage,
			logo,
			shade,
			deepSharp,
			deepSoft,
			backSharp,
			backSoft
		});
		// Hand off even if the leaves couldn't be prepared, so the loader never strands the visitor.
		scene.ready
			.catch((error) => console.error('Jungle scene failed to start', error))
			.finally(() => onready?.());
		return () => scene.destroy();
	});
</script>

<div class="h-[300lvh]">
	<div
		bind:this={stage}
		data-jungle-stage
		class="sticky top-0 h-lvh w-full overflow-hidden bg-white perspective-[1400px] [contain:strict]"
	>
		<div
			bind:this={shade}
			aria-hidden="true"
			class="pointer-events-none absolute -inset-[40%] will-change-transform"
		></div>
		<img
			bind:this={logo}
			src={logoSrc}
			alt="Toma Nistor - San Diego Software Engineer"
			class="absolute left-1/2 top-1/2 w-[min(50vw,57vh)] will-change-transform"
			style:transform={startTransform}
		/>
		<canvas bind:this={deepSharp} aria-hidden="true" class="{layerClass} z-[1]"></canvas>
		<canvas bind:this={deepSoft} aria-hidden="true" class="{layerClass} z-[1]"></canvas>
		<canvas bind:this={backSharp} aria-hidden="true" class="{layerClass} z-[2]"></canvas>
		<canvas bind:this={backSoft} aria-hidden="true" class="{layerClass} z-[2]"></canvas>
	</div>
</div>
