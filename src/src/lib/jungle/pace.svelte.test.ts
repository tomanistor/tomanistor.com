import { afterEach, describe, expect, it, vi } from 'vitest';
import { yieldToMain } from './pace';

describe('yieldToMain', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('without scheduler.yield, resolves every yield in order over one message channel', async () => {
		let channels = 0;
		vi.stubGlobal('scheduler', undefined);
		vi.stubGlobal(
			'MessageChannel',
			class extends MessageChannel {
				constructor() {
					super();
					channels++;
				}
			}
		);
		const order: number[] = [];
		await Promise.all(
			Array.from({ length: 300 }, (_, i) => yieldToMain().then(() => order.push(i)))
		);
		await yieldToMain();
		expect(order).toEqual(Array.from({ length: 300 }, (_, i) => i));
		expect(channels).toBe(1);
	});
});
