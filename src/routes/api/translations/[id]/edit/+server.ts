import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const PUT: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { translation, comment } = body;
	const id = Number(params.id);

	const { error } = await supabase
		.from('translations')
		.update({
			translation,
			comment: comment ?? null,
		})
		.eq('id', id);

	if (error) {
		return apiError(error);
	}

	return json({ success: true });
};
