import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const like = body.like === true;
	const id = Number(params.id);

	const fn = like ? 'increment_translation_likes' : 'decrement_translation_likes';
	const { data, error } = await supabase.rpc(fn, { trans_id: id });

	if (error) {
		return apiError(error);
	}

	if (data === null) {
		return json({ error: 'Translation not found' }, { status: 404 });
	}

	return json({ likes: data });
};
