import { supabase } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { CACHE_TTL } from '$lib/constants';
import type { Post } from '$lib/types';

export async function GET({ params }) {
	const { data, error } = await supabase.from('posts').select('*').eq('slug', params.slug).single();

	if (error || !data) {
		return json({ error: 'Post not found' }, { status: 404 });
	}

	return json(data as Post, {
		headers: { 'cache-control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}` },
	});
}
