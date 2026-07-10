import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const GET: RequestHandler = async ({ params }) => {
	const { data, error } = await supabase.rpc('get_word_by_id', { word_id: params.id });

	if (error) return apiError(error);

	if (!data) {
		return json({ error: 'Word not found' }, { status: 404 });
	}

	return json({ word: data });
};
