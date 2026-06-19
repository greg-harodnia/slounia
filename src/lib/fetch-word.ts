import type { WordData } from '$lib/types';

const cache = new Map<string, WordData>();
const pending = new Map<string, Promise<void>>();

export function getCachedWord(id: string): WordData | undefined {
	return cache.get(id);
}

export function fetchWord(id: string): Promise<void> {
	const cached = cache.get(id);
	if (cached) return Promise.resolve();
	const existing = pending.get(id);
	if (existing) return existing;
	const p = fetch(`/api/words/${encodeURIComponent(id)}`)
		.then((r) => (r.ok ? r.json() : null))
		.then((data) => {
			if (data?.word) cache.set(id, data.word as WordData);
		})
		.catch(() => {})
		.finally(() => pending.delete(id));
	pending.set(id, p);
	return p;
}
