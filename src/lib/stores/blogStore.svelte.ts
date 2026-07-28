import { PAGE_SIZE } from '$lib/constants';
import type { Post } from '$lib/types';

class BlogStore {
	posts = $state<Post[]>([]);
	total = $state(0);
	loading = $state(false);
	currentPage = $state(1);

	totalPages = $derived(Math.ceil(this.total / PAGE_SIZE));

	async fetchPage(page: number) {
		this.loading = true;
		const offset = (page - 1) * PAGE_SIZE;
		try {
			const res = await fetch(`/api/blog?limit=${PAGE_SIZE}&offset=${offset}`);
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
}

export const blogStore = new BlogStore();
