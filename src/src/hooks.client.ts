import * as Sentry from '@sentry/sveltekit';
import { updated } from '$app/state';

const chunkErrors = new WeakSet<object>();

// A page loaded before a deploy still points at the old build's chunks, which Netlify no longer serves.
window.addEventListener('vite:preloadError', async (event) => {
	chunkErrors.add(event.payload);
	if (await updated.check()) location.reload();
});

Sentry.init({
	dsn: 'https://5545d0d5140d43479400e40a29153d5d@sentry.io/1375351',
	// Local dev, the e2e suite's preview server and deploy previews all run off other hosts.
	enabled: location.hostname === 'tomanistor.com',
	integrations: [
		// Everything on the site is public and there are no inputs, so masking would only hide context.
		Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
		Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })
	],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	// The reload above recovers from these when a newer build is live; any other cause is a real failure.
	beforeSend: async (event, { originalException }) =>
		originalException instanceof Object &&
		chunkErrors.has(originalException) &&
		(await updated.check())
			? null
			: event
});

export const handleError = Sentry.handleErrorWithSentry();
