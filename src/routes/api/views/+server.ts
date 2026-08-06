import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ request }) => {
	if (!import.meta.env.PROD) {
		return json({ views: null });
	}

	const body = await request.json().catch(() => null);
	if (!body || (body.kind !== 'word' && body.kind !== 'post') || typeof body.id !== 'string' || !body.id) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const supabase = getServiceClient();
	const fn = body.kind === 'word' ? 'increment_word_views' : 'increment_post_views';
	const args = body.kind === 'word' ? { word_id: body.id } : { post_slug: body.id };

	const { data, error } = await supabase.rpc(fn, args);

	if (error) {
		return apiError(error);
	}

	if (data === null) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({ views: data });
};
