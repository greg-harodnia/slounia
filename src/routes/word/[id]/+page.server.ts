import { supabase } from '$lib/server/db';
import { error as kitError } from '@sveltejs/kit';
import type { WordData } from '$lib/types';

export async function load({ params }) {
	const { data, error } = await supabase.rpc('get_word_by_id', { word_id: params.id });

	if (error || !data) {
		throw kitError(404, 'Word not found');
	}

	const word = data as WordData;

	return { word };
}
