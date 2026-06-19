import { supabase } from '$lib/server/db';
import { error as kitError } from '@sveltejs/kit';
import type { WordData } from '$lib/types';

export async function load({ params }) {
	const { data, error } = await supabase.rpc('get_words', {
		search: '',
		tag_filter: '',
		sort_field: 'word',
		sort_dir: 'asc',
		result_offset: 0,
		result_limit: 1,
		word_ids: [params.id],
	});

	if (error || !data || !data.words || data.words.length === 0) {
		throw kitError(404, 'Word not found');
	}

	const word = (data.words as WordData[])[0];

	return { word };
}
