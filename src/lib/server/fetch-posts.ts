import { supabase } from '$lib/server/db';
import type { PostSummary } from '$lib/types';

interface BlogPostsParams {
	limit?: number;
	offset?: number;
	hashtag?: string | null;
}

// List feeds never render the body, so only select the columns BlogCard needs
// instead of `select('*')` — posts are stored with full HTML in `content`.
const LIST_COLUMNS = 'id,slug,title,hashtags,is_pinned,views,published_at';

// Shared by the /blog page SSR load and the /api/blog endpoint so both expose
// exactly the same feed: pinned first, newest first. Scheduled (future) posts
// are hidden from the public site but stay visible in dev so BlogAdmin can
// still edit/delete them.
export async function fetchBlogPosts({ limit = 50, offset = 0, hashtag = null }: BlogPostsParams) {
	let query = supabase
		.from('posts')
		.select(LIST_COLUMNS, { count: 'exact' })
		.order('is_pinned', { ascending: false })
		.order('published_at', { ascending: false });

	if (import.meta.env.PROD) {
		query = query.lte('published_at', new Date().toISOString());
	}

	if (hashtag) {
		query = query.contains('hashtags', [hashtag]);
	}

	const { data, error, count } = await query.range(offset, offset + limit - 1);

	return { posts: (data as PostSummary[]) ?? [], total: count ?? 0, error };
}
