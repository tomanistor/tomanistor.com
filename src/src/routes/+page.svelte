<script lang="ts">
	import logo from '$lib/assets/logo/toma-nistor-logo.svg';
	import JungleLoader from '$lib/components/JungleLoader.svelte';
	import JungleScene from '$lib/components/JungleScene.svelte';

	let ready = $state(false);
</script>

<svelte:head>
	<title>Toma Nistor – San Diego Software Engineer</title>
	<meta
		name="description"
		content="Toma Nistor is a San Diego software engineer building fast, thoughtfully crafted websites and web apps."
	/>
</svelte:head>

<JungleScene onready={() => (ready = true)} />
<JungleLoader done={ready} />

<noscript>
	<img
		src={logo}
		alt="Toma Nistor - San Diego Software Engineer"
		class="fixed left-1/2 top-[44%] z-[2001] w-[calc(min(50vw,57vh)*2/3)] -translate-x-1/2 -translate-y-1/2"
	/>
	<p
		class="fixed left-0 top-[calc(44%+min(50vw,57vh)*2/3*197/225*0.59)] z-[2001] w-full whitespace-nowrap px-6 text-center font-display uppercase text-[#212121]"
	>
		<span
			class="block text-[calc(min(50vw,57vh)*2/3/6.86)] font-black leading-[0.95] tracking-[-0.01em] [word-spacing:0.06em]"
			>Toma Nistor</span
		>
		<span class="sr-only"> – </span>
		<span
			class="mt-[0.25em] block text-[max(12px,calc(min(50vw,57vh)*2/3/15.55))] font-semibold leading-[0.95]"
			>San Diego Software Engineer</span
		>
	</p>
</noscript>
