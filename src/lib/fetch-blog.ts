import type { Post } from '$lib/types';

const LIST_KEY = '__list__';
const cache = new Map<string, Post | Post[]>();
const pending = new Map<string, Promise<void>>();

export function getCachedBlogList(): Post[] | undefined {
	return cache.get(LIST_KEY) as Post[] | undefined;
}

export function getCachedBlogPost(slug: string): Post | undefined {
	return cache.get(slug) as Post | undefined;
}

export function fetchBlogList(): Promise<void> {
	const cached = cache.get(LIST_KEY);
	if (cached) return Promise.resolve();
	const existing = pending.get(LIST_KEY);
	if (existing) return existing;
	const p = fetch('/api/blog')
		.then((r) => (r.ok ? r.json() : null))
		.then((data) => {
			if (data?.posts) cache.set(LIST_KEY, data.posts as Post[]);
		})
		.catch(() => {})
		.finally(() => pending.delete(LIST_KEY));
	pending.set(LIST_KEY, p);
	return p;
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
