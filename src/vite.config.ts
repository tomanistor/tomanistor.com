import { defineConfig } from 'vitest/config';
import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sentrySvelteKit({
			adapter: 'other',
			autoInstrument: false,
			// Also needs SENTRY_ORG and SENTRY_PROJECT. adapter-static copies the maps into build/,
			// which Sentry's default cleanup misses, so they'd otherwise be published.
			autoUploadSourceMaps: !!process.env.SENTRY_AUTH_TOKEN,
			sourcemaps: { filesToDeleteAfterUpload: ['./.svelte-kit/**/*.map', './build/**/*.map'] },
			telemetry: false
		}),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			// Netlify serves 404.html at any depth, so its asset and homepage URLs must not be relative.
			paths: { relative: false }
		})
	],
	// Sentry's tree-shaking flags. Its bundleSizeOptimizations option does the same but also
	// switches on source map generation without a token to upload them.
	define: { __SENTRY_TRACING__: false, __SENTRY_DEBUG__: false },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: [
						'src/lib/server/**',
						// CI runners have no GPU, and these time the live scene, which software WebGL
						// renders too slowly for.
						...(process.env.CI ? ['src/lib/components/JungleScene.svelte.test.ts'] : [])
					],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
