<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/logo/favicon.ico';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
