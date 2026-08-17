import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase, getServiceClient } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const GET: RequestHandler = async ({ params }) => {
	// Hidden words are RLS-blocked for anon, so only dev (which uses the
	// service client) can fetch them; in prod the query returns nothing -> 404.
	const client = import.meta.env.PROD ? supabase : getServiceClient();
	const { data, error } = await client.rpc('get_word_by_id', { word_id: params.id });

	if (error) return apiError(error);

	if (!data) {
		return json({ error: 'Word not found' }, { status: 404 });
	}

	return json({ word: data });
};
