import type { Post } from '$lib/types';

export type FetchStatus = 'ok' | 'not_found' | 'error';

const cache = new Map<string, Post>();
const pending = new Map<string, Promise<FetchStatus>>();

export function getCachedBlogPost(slug: string): Post | undefined {
	return cache.get(slug) as Post | undefined;
}

export function fetchBlogPost(slug: string): Promise<FetchStatus> {
	const cached = cache.get(slug);
	if (cached) return Promise.resolve('ok');
	const existing = pending.get(slug);
	if (existing) return existing;
	const p = fetch(`/api/blog/${slug}`)
		.then(async (r) => {
			if (!r.ok) return 'not_found' as const;
			const data = await r.json();
			if (data) cache.set(slug, data as Post);
			return 'ok' as const;
		})
		.catch(() => 'error' as const)
		.finally(() => pending.delete(slug));
	pending.set(slug, p);
	return p;
}
