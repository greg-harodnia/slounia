import { supabase } from '$lib/server/db';
import type { Post } from '$lib/types';

interface BlogPostsParams {
	limit?: number;
	offset?: number;
	hashtag?: string | null;
}

// Shared by the /blog page SSR load and the /api/blog endpoint so both expose
// exactly the same feed: pinned first, newest first. Scheduled (future) posts
// are hidden from the public site but stay visible in dev so BlogAdmin can
// still edit/delete them.
export async function fetchBlogPosts({ limit = 50, offset = 0, hashtag = null }: BlogPostsParams) {
	let query = supabase
		.from('posts')
		.select('*', { count: 'exact' })
		.order('is_pinned', { ascending: false })
		.order('published_at', { ascending: false });

	if (import.meta.env.PROD) {
		query = query.lte('published_at', new Date().toISOString());
	}

	if (hashtag) {
		query = query.contains('hashtags', [hashtag]);
	}

	const { data, error, count } = await query.range(offset, offset + limit - 1);

	return { posts: (data as Post[]) ?? [], total: count ?? 0, error };
}
