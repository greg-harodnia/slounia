import { error as kitError } from '@sveltejs/kit';
import type { WordData } from '$lib/types';

export async function load({ params }) {
	if (!import.meta.env.SSR) {
		return { word: null as WordData | null };
	}

	const { supabase } = await import('$lib/server/db');
	const { data, error } = await supabase.rpc('get_word_by_id', { word_id: params.id });

	if (error || !data) {
		throw kitError(404, 'Word not found');
	}

	return { word: data as WordData };
}
