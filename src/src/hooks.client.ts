import * as Sentry from '@sentry/sveltekit';
import { updated } from '$app/state';

// A page loaded before a deploy still points at the old build's chunks, which Netlify no longer serves.
window.addEventListener('vite:preloadError', async () => {
	if (await updated.check()) location.reload();
});

Sentry.init({
	dsn: 'https://5545d0d5140d43479400e40a29153d5d@sentry.io/1375351',
	// Local dev, the e2e suite's preview server and deploy previews all run off other hosts.
	enabled: location.hostname === 'tomanistor.com'
});

export const handleError = Sentry.handleErrorWithSentry();
