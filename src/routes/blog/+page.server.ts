import { supabase } from '$lib/server/db';
import type { Post } from '$lib/types';

export async function load({ url }) {
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const { data, error, count } = await supabase
		.from('posts')
		.select('*', { count: 'exact' })
		.order('is_pinned', { ascending: false })
		.order('published_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		return { posts: [], total: 0 };
	}

	return { posts: data as Post[], total: count ?? 0 };
}
