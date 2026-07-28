import { supabase } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { CACHE_TTL } from '$lib/constants';
import type { Post } from '$lib/types';

export async function GET({ url }) {
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const hashtag = url.searchParams.get('hashtag');

	let query = supabase
		.from('posts')
		.select('*', { count: 'exact' })
		.order('is_pinned', { ascending: false })
		.order('published_at', { ascending: false });

	if (hashtag) {
		query = query.contains('hashtags', [hashtag]);
	}

	const { data, error, count } = await query.range(offset, offset + limit - 1);

	if (error) {
		return json({ posts: [], total: 0 }, { status: 500 });
	}

	return json(
		{ posts: data as Post[], total: count ?? 0 },
		{
			headers: { 'cache-control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}` },
		},
	);
}
