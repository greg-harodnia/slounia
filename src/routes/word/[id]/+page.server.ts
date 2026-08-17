import { error as kitError } from '@sveltejs/kit';
import type { WordData } from '$lib/types';

export async function load({ params }) {
	const { supabase, getServiceClient } = await import('$lib/server/db');
	// Hidden words are RLS-blocked for anon, so prod 404s on them; dev uses
	// the service client so the dev_mode admin can still open them.
	const client = import.meta.env.PROD ? supabase : getServiceClient();
	const { data, error } = await client.rpc('get_word_by_id', { word_id: params.id });

	if (error || !data) {
		throw kitError(404, 'Word not found');
	}

	return { word: data as WordData };
}
