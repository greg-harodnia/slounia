import { error as kitError } from '@sveltejs/kit';
import type { Post } from '$lib/types';

export async function load({ params }) {
	const { supabase } = await import('$lib/server/db');
	const { data, error } = await supabase.from('posts').select('*').eq('slug', params.slug).single();

	if (error || !data) {
		throw kitError(404, 'Post not found');
	}

	return { post: data as Post };
}
