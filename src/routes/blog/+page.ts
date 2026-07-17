import type { Post } from '$lib/types';

export function load() {
	return {
		posts: [] as Post[],
		total: 0,
	};
}
