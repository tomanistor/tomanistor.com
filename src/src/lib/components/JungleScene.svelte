<script lang="ts">
	import { onMount } from 'svelte';
	import logoSrc from '#lib/assets/logo/toma-nistor-logo.svg';
	import { createJungleScene } from '#lib/jungle/scene.ts';

	let { onready }: { onready?: () => void } = $props();

	let stage: HTMLElement;
	let fallbackLogo: HTMLImageElement;
	let title: HTMLElement;
	let social: HTMLElement;

	onMount(() => {
		const scene = createJungleScene({ stage, fallbackLogo, title, social });
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
		<!-- Starts below the stage; the scene places it under the logo and fades the lines in. -->
		<h1
			bind:this={title}
			data-title
			class="absolute left-0 top-0 z-[600] w-full whitespace-nowrap px-6 text-center font-display uppercase text-[#212121] [transform:translateY(100lvh)]"
		>
			<span
				data-title-name
				class="block font-black leading-[0.95] tracking-[-0.01em] opacity-0 [word-spacing:0.06em]"
				>Toma Nistor</span
			>
			<span class="sr-only"> – </span>
			<span data-title-subtitle class="mt-[0.25em] block font-semibold leading-[0.95] opacity-0"
				>San Diego Software Engineer</span
			>
		</h1>
		<!-- Starts below the stage like the title; the scene places it and fades the links in. -->
		<footer
			bind:this={social}
			data-social
			class="pointer-events-none absolute inset-x-0 top-0 z-[600] mx-auto flex w-fit gap-6 text-[#212121] [transform:translateY(100lvh)]"
		>
			<a
				href="https://github.com/tomanistor"
				aria-label="GitHub (opens in a new tab)"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative grid size-11 place-items-center rounded-full outline-hidden transition-colors duration-200 hover:text-white focus-visible:text-white forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid opacity-0 focus-visible:opacity-100!"
			>
				<span
					aria-hidden="true"
					class="absolute inset-0 scale-0 rounded-full bg-[#212121] transition-transform duration-[250ms] ease-[cubic-bezier(0.3,1.4,0.6,1)] group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:group-hover:opacity-100 motion-reduce:group-focus-visible:opacity-100"
				></span>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="relative size-[22px]"
				>
					<path
						d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
					/>
				</svg>
			</a>
			<a
				href="https://linkedin.com/in/tomanistor"
				aria-label="LinkedIn (opens in a new tab)"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative grid size-11 place-items-center rounded-full outline-hidden transition-colors duration-200 hover:text-white focus-visible:text-white forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid opacity-0 focus-visible:opacity-100!"
			>
				<span
					aria-hidden="true"
					class="absolute inset-0 scale-0 rounded-full bg-[#212121] transition-transform duration-[250ms] ease-[cubic-bezier(0.3,1.4,0.6,1)] group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:group-hover:opacity-100 motion-reduce:group-focus-visible:opacity-100"
				></span>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="relative size-[22px]"
				>
					<path
						d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
					/>
				</svg>
			</a>
		</footer>
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
