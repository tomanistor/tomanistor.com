// Lighthouse slows the CPU 4×, so an 8ms slice stays under the 50ms that counts as a long task.
const SLICE_MS = 8;

type Scheduler = { yield(): Promise<void> };

// Thrown at a yield when the build no longer wanted has to stop.
export class Stale extends Error {}

export type Pace = () => Promise<void>;

let channel: MessageChannel | undefined;
const waiting: (() => void)[] = [];

// A setTimeout would be clamped, so without `scheduler.yield` a message round trip lets input in.
// One channel serves every yield, since messages arrive in the order they were posted.
export function yieldToMain(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: Scheduler }).scheduler;
	if (scheduler?.yield) return scheduler.yield();
	if (!channel) {
		channel = new MessageChannel();
		channel.port1.onmessage = () => waiting.shift()!();
	}
	const port = channel.port2;
	return new Promise((resolve) => {
		waiting.push(resolve);
		port.postMessage(null);
	});
}

// Undoes a stopped build's work, then rethrows why it stopped: a failing cleanup must neither turn
// a `Stale` build into an error nor hide the error that stopped it.
export function abandon(error: unknown, cleanup: () => void): never {
	try {
		cleanup();
	} catch {
		// `error` is the one that counts.
	}
	throw error;
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
