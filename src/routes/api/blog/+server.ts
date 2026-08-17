import { json } from '@sveltejs/kit';
import { CACHE_TTL } from '$lib/constants';
import { fetchBlogPosts } from '$lib/server/fetch-posts';

export async function GET({ url }) {
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const hashtag = url.searchParams.get('hashtag');

	const { posts, total, error } = await fetchBlogPosts({ limit, offset, hashtag });

	if (error) {
		return json({ posts: [], total: 0 }, { status: 500 });
	}

	return json(
		{ posts, total },
		{
			headers: { 'cache-control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}` },
		},
	);
}
