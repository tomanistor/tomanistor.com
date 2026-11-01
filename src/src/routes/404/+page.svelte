<script lang="ts">
	import { resolve } from '$app/paths';
	import logo from '$lib/assets/logo/toma-nistor-logo.svg';
</script>

<svelte:head>
	<title>Page not found – Toma Nistor</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center font-display text-[#212121]"
>
	<img src={logo} alt="Toma Nistor" class="w-40" />
	<h1 class="text-3xl font-black">Page not found</h1>
	<a href={resolve('/')} class="font-semibold underline underline-offset-4">Back to the homepage</a>
</main>
