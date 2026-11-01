import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'e2e',
	use: {
		// Headless Chromium on macOS falls back to a software renderer at about 1 frame a second at
		// 3440×1440, which is too slow for the springs to settle; Metal runs the scene at 60.
		launchOptions: { args: process.platform === 'darwin' ? ['--use-angle=metal'] : [] }
	}
});
