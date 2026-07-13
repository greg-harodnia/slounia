import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const GET: RequestHandler = async () => {
	const { data, error } = await supabase.from('tags').select('id, name');

	if (error) {
		return apiError(error);
	}

	return json(data, {
		headers: { 'cache-control': 'public, s-maxage=604800, stale-while-revalidate=604800' },
	});
};
