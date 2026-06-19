import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const DELETE: RequestHandler = async ({ params }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const { error } = await supabase.from('words').delete().eq('id', params.id);

	if (error) {
		return apiError(error);
	}

	return json({ success: true });
};
