import { BLOG_PAGE_SIZE } from '$lib/constants';
import { fetchBlogPosts } from '$lib/server/fetch-posts';

export async function load({ url }) {
	const rawPage = parseInt(url.searchParams.get('page') || '1', 10);
	const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
	const hashtag = url.searchParams.get('hashtag');

	const { posts, total, error } = await fetchBlogPosts({
		limit: BLOG_PAGE_SIZE,
		offset: (page - 1) * BLOG_PAGE_SIZE,
		hashtag,
	});

	return { posts: error ? [] : posts, total: error ? 0 : total, page, hashtag };
}
