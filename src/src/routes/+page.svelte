<script lang="ts">
	import logo from '$lib/assets/logo/toma-nistor-logo.svg';
	import JungleLoader from '$lib/components/JungleLoader.svelte';
	import JungleScene from '$lib/components/JungleScene.svelte';

	let ready = $state(false);
</script>

<h1 class="sr-only">Toma Nistor – San Diego Software Engineer</h1>

<JungleScene onready={() => (ready = true)} />
<JungleLoader done={ready} />

<noscript>
	<img
		src={logo}
		alt="Toma Nistor - San Diego Software Engineer"
		class="fixed left-1/2 top-1/2 z-[2001] w-[min(50vw,57vh)] -translate-x-1/2 -translate-y-1/2 scale-[0.818]"
	/>
</noscript>
