import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const GET: RequestHandler = async ({ params }) => {
	const { data, error } = await supabase.rpc('get_words', {
		search: '',
		tag_filter: '',
		sort_field: 'word',
		sort_dir: 'asc',
		result_offset: 0,
		result_limit: 1,
		word_ids: [params.id],
	});

	if (error) return apiError(error);

	if (!data || !data.words || data.words.length === 0) {
		return json({ error: 'Word not found' }, { status: 404 });
	}

	return json({ word: (data.words as Array<unknown>)[0] });
};
