import type { Post } from '$lib/types';

const cache = new Map<string, Post>();
const pending = new Map<string, Promise<void>>();

export function getCachedBlogPost(slug: string): Post | undefined {
	return cache.get(slug) as Post | undefined;
}

export function fetchBlogPost(slug: string): Promise<void> {
	const cached = cache.get(slug);
	if (cached) return Promise.resolve();
	const existing = pending.get(slug);
	if (existing) return existing;
	const p = fetch(`/api/blog/${slug}`)
		.then((r) => (r.ok ? r.json() : null))
		.then((data) => {
			if (data) cache.set(slug, data as Post);
		})
		.catch(() => {})
		.finally(() => pending.delete(slug));
	pending.set(slug, p);
	return p;
}
