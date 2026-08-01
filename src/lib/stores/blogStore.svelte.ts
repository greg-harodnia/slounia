import type { Post } from '$lib/types';
import { SvelteURLSearchParams } from 'svelte/reactivity';

const PAGE_SIZE = 5;

class BlogStore {
	posts = $state<Post[]>([]);
	total = $state(0);
	loading = $state(false);
	currentPage = $state(1);
	hashtagFilter = $state<string | null>(null);

	totalPages = $derived(Math.ceil(this.total / PAGE_SIZE));

	async fetchPage(page: number) {
		this.loading = true;
		const offset = (page - 1) * PAGE_SIZE;
		const params = new SvelteURLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
		if (this.hashtagFilter) params.set('hashtag', this.hashtagFilter);
		try {
			const res = await fetch(`/api/blog?${params}`);
			if (res.ok) {
				const json = await res.json();
				this.posts = json.posts;
				this.total = json.total;
				this.currentPage = page;
			}
		} finally {
			this.loading = false;
		}
	}

	goToPage(page: number) {
		if (page < 1 || page > this.totalPages) return;
		this.fetchPage(page);
	}

	toggleHashtag(hashtag: string) {
		this.hashtagFilter = this.hashtagFilter === hashtag ? null : hashtag;
		this.fetchPage(1);
	}
}

export const blogStore = new BlogStore();
