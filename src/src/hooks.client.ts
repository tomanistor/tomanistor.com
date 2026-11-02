import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://5545d0d5140d43479400e40a29153d5d@sentry.io/1375351',
	// Local dev, the e2e suite's preview server and deploy previews all run off other hosts.
	enabled: location.hostname === 'tomanistor.com'
});

export const handleError = Sentry.handleErrorWithSentry();
