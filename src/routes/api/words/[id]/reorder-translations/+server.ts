import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const PUT: RequestHandler = async ({ params: _params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const { translation_ids } = await request.json();

	if (!Array.isArray(translation_ids)) {
		return json({ error: 'translation_ids array is required' }, { status: 400 });
	}

	for (let i = 0; i < translation_ids.length; i++) {
		const { error } = await supabase.from('translations').update({ sort_order: i }).eq('id', translation_ids[i]);

		if (error) {
			return apiError(error);
		}
	}

	return json({ success: true });
};
