import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { scrollTo, waitForScene } from './measure';

test.describe.configure({ timeout: 60000 });

const violations = async (page: Page) =>
	(
		await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
			.analyze()
	).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }));

test('the homepage has no accessibility violations at either end of the scroll', async ({
	page
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await waitForScene(page);
	expect(await violations(page), 'at the start').toEqual([]);
	await scrollTo(page, 1);
	expect(await violations(page), 'at the end').toEqual([]);
});

test('the 404 page has no accessibility violations', async ({ page }) => {
	await page.goto('/404');
	expect(await violations(page)).toEqual([]);
});

// axe can't run in a page with JavaScript disabled, so this serves the homepage as such a browser
// renders it: a CSP stops every page script from running, and the <noscript> fallback is in the DOM.
test('the homepage fallback without JavaScript has no accessibility violations', async ({
	page
}) => {
	await page.route('/', async (route) => {
		const response = await route.fetch();
		await route.fulfill({
			response,
			headers: { ...response.headers(), 'content-security-policy': "script-src 'none'" },
			body: (await response.text()).replaceAll(/<\/?noscript>/g, '')
		});
	});
	const blocked: string[] = [];
	page.on('console', (message) => {
		if (message.text().includes('Content Security Policy')) blocked.push(message.text());
	});
	await page.goto('/');
	await expect(page.locator('noscript')).toHaveCount(0);
	await expect.poll(() => blocked.length).toBeGreaterThan(0);
	expect(await violations(page)).toEqual([]);
});
