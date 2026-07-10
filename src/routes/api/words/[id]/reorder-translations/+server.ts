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

	const sortOrders = translation_ids.map((_: string, i: number) => i);

	const { error } = await supabase.rpc('reorder_translations', {
		translation_ids: translation_ids.map(Number),
		sort_orders: sortOrders,
	});

	if (error) {
		return apiError(error);
	}

	return json({ success: true });
};
