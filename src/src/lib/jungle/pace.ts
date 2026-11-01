// Lighthouse slows the CPU 4×, so an 8ms slice stays under the 50ms that counts as a long task.
const SLICE_MS = 8;

type Scheduler = { yield(): Promise<void> };

// Thrown at a yield when the build no longer wanted has to stop.
export class Stale extends Error {}

export type Pace = () => Promise<void>;

// A setTimeout would be clamped, so without `scheduler.yield` a message round trip lets input in.
export function yieldToMain(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
	if (scheduler?.yield) return scheduler.yield();
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		channel.port1.onmessage = () => resolve();
		channel.port2.postMessage(null);
	});
}

// Awaited between units of work: yields once the slice has run 8ms, and throws `Stale` once
// `wanted` turns false.
export function pacer(wanted: () => boolean): Pace {
	let start = performance.now();
	return async () => {
		if (performance.now() - start >= SLICE_MS) {
			await yieldToMain();
			start = performance.now();
		}
		if (!wanted()) throw new Stale();
	};
}
