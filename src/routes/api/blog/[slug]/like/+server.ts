import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const like = body.like === true;

	const fn = like ? 'increment_post_likes' : 'decrement_post_likes';
	const { data, error } = await supabase.rpc(fn, { post_slug: params.slug });

	if (error) {
		return apiError(error);
	}

	if (data === null) {
		return json({ error: 'Post not found' }, { status: 404 });
	}

	return json({ likes: data });
};
