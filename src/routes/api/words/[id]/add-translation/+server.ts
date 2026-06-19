import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { translation, comment } = body;

	if (!translation) {
		return json({ error: 'Translation text is required' }, { status: 400 });
	}

	const { data: maxRow } = await supabase
		.from('translations')
		.select('sort_order')
		.eq('word_id', params.id)
		.order('sort_order', { ascending: false })
		.limit(1)
		.single();

	const nextSortOrder = maxRow ? (maxRow.sort_order ?? 0) + 1 : 0;

	const { data, error } = await supabase
		.from('translations')
		.insert({
			word_id: params.id,
			translation,
			comment: comment ?? null,
			sort_order: nextSortOrder,
		})
		.select()
		.single();

	if (error) {
		return apiError(error);
	}

	return json({ translation: data });
};
