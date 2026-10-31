<script lang="ts">
	import { onMount } from 'svelte';
	import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
	import { LOGO_DIST, zoomAt } from '$lib/jungle/camera';
	import { createJungleScene } from '$lib/jungle/scene';

	let { onready }: { onready?: () => void } = $props();

	let stage: HTMLElement;
	let fallbackLogo: HTMLImageElement;

	// The logo's size at the top of the page, where the scene starts.
	const startTransform = `translate(-50%, -50%) scale(${zoomAt(LOGO_DIST, 0).toFixed(4)})`;

	onMount(() => {
		const scene = createJungleScene({ stage, fallbackLogo });
		scene.ready.then(() => onready?.());
		return () => scene.destroy();
	});
</script>

<div class="h-[300lvh]">
	<div
		bind:this={stage}
		data-jungle-stage
		class="sticky top-0 h-lvh w-full overflow-hidden bg-white [contain:strict]"
	>
		<!-- Shown only when the scene can't draw, so the page never ends up blank. -->
		<img
			bind:this={fallbackLogo}
			data-fallback-logo
			hidden
			src={logoSrc}
			alt="Toma Nistor - San Diego Software Engineer"
			class="absolute left-1/2 top-1/2 w-[min(50vw,57vh)]"
			style:transform={startTransform}
		/>
		<!-- A lens vignette over the whole scene; clear well before the logo. -->
		<div
			data-vignette
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 z-[500] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(8,26,14,0.35)_100%)]"
		></div>
	</div>
</div>
