import { error as kitError } from '@sveltejs/kit';
import type { Post } from '$lib/types';

export async function load({ params }) {
	const { supabase } = await import('$lib/server/db');
	let query = supabase.from('posts').select('*').eq('slug', params.slug);
	if (import.meta.env.PROD) {
		query = query.lte('published_at', new Date().toISOString());
	}
	const { data, error } = await query.single();

	if (error || !data) {
		throw kitError(404, 'Post not found');
	}

	return { post: data as Post };
}
