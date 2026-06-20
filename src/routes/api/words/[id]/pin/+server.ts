import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const PUT: RequestHandler = async ({ params }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const { data: word, error: fetchError } = await supabase
		.from('words')
		.select('is_pinned')
		.eq('id', params.id)
		.single();

	if (fetchError || !word) {
		return apiError(fetchError ?? new Error('Word not found'));
	}

	const newPinned = !word.is_pinned;
	const updates: Record<string, unknown> = { is_pinned: newPinned };
	if (newPinned) {
		updates.pinned_at = new Date().toISOString();
	} else {
		updates.pinned_at = null;
	}

	const { error: updateError } = await supabase.from('words').update(updates).eq('id', params.id);

	if (updateError) {
		return apiError(updateError);
	}

	return json({ success: true, is_pinned: newPinned });
};
