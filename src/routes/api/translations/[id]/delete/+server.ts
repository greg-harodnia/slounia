import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const DELETE: RequestHandler = async ({ params }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const id = Number(params.id);

	const { error } = await supabase.from('translations').delete().eq('id', id);

	if (error) {
		return apiError(error);
	}

	return json({ success: true });
};
