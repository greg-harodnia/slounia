import type { WordData } from '$lib/types';

export type FetchStatus = 'ok' | 'not_found' | 'error';

const cache = new Map<string, WordData>();
const pending = new Map<string, Promise<FetchStatus>>();

export function getCachedWord(id: string): WordData | undefined {
	return cache.get(id);
}

export function setCachedWord(id: string, data: WordData): void {
	cache.set(id, data);
}

export function fetchWord(id: string): Promise<FetchStatus> {
	const cached = cache.get(id);
	if (cached) return Promise.resolve('ok');
	const existing = pending.get(id);
	if (existing) return existing;
	const p = fetch(`/api/words/${encodeURIComponent(id)}`)
		.then(async (r) => {
			if (!r.ok) return 'not_found' as const;
			const data = await r.json();
			if (data?.word) cache.set(id, data.word as WordData);
			return 'ok' as const;
		})
		.catch(() => 'error' as const)
		.finally(() => pending.delete(id));
	pending.set(id, p);
	return p;
}
