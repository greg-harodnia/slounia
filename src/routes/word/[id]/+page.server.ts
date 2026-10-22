import { redirect as kitRedirect } from '@sveltejs/kit';
import type { WordData } from '$lib/types';

export async function load({ params }) {
	const { supabase, getServiceClient } = await import('$lib/server/db');
	// Hidden words are RLS-blocked for anon, so prod 404s on them; dev uses
	// the service client so the dev_mode admin can still open them.
	const client = import.meta.env.PROD ? supabase : getServiceClient();
	const { data, error } = await client.rpc('get_word_by_id', { word_id: params.id });

	if (error || !data) {
		// Intentional UX: an unknown word lands on search results for that ID.
		// The target canonicalizes to `/`, so it isn't indexed as separate content.
		throw kitRedirect(302, `/?search=${encodeURIComponent(params.id)}`);
	}

	return { word: data as WordData };
}
