<script lang="ts">
	import { onMount } from 'svelte';
	import logoSrc from '$lib/assets/logo/toma-nistor-logo.svg';
	import { createJungleScene } from '$lib/jungle/scene';

	let { onready }: { onready?: () => void } = $props();

	let stage: HTMLElement;
	let fallbackLogo: HTMLImageElement;
	let title: HTMLElement;

	onMount(() => {
		const scene = createJungleScene({ stage, fallbackLogo, title });
		scene.ready.then(() => onready?.());
		return () => scene.destroy();
	});
</script>

<div class="h-[500lvh]">
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
			class="absolute left-1/2 top-1/2 w-[min(50vw,57vh)] -translate-x-1/2 -translate-y-1/2"
		/>
		<!-- Starts below the stage; the scene brings it up under the logo. -->
		<h1
			bind:this={title}
			data-title
			class="absolute left-0 top-0 z-[600] w-full [transform:translateY(100lvh)] text-balance px-6 text-center font-semibold text-[#212121]"
		>
			Toma Nistor – San Diego Software Engineer
		</h1>
		<!-- A lens vignette over the whole scene; clear well before the logo. -->
		<div
			data-vignette
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 z-[500] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(8,26,14,0.35)_100%)] opacity-[calc(1_-_var(--open,0))]"
		></div>
		<!-- Once the arch opens, the vignette moves to the top and the sides, leaving the bottom clear. -->
		<div
			data-vignette="arch"
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 z-[500] bg-[linear-gradient(to_bottom,rgba(8,26,14,0.35),transparent_25%),linear-gradient(to_right,rgba(8,26,14,0.35),transparent_25%,transparent_75%,rgba(8,26,14,0.35))] opacity-[var(--open,0)]"
		></div>
	</div>
</div>
