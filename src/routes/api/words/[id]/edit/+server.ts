import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const PUT: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { id, comment, importance_id, tag_ids, hidden } = body;

	const newId = id && id !== params.id ? id : null;

	const updates: Record<string, unknown> = {};
	if (newId) updates.id = newId;
	if (comment !== undefined) updates.comment = comment ?? null;
	if (importance_id !== undefined) updates.importance_id = importance_id ?? null;
	if (hidden !== undefined) updates.hidden = hidden;

	const { error } = await supabase.from('words').update(updates).eq('id', params.id);

	if (error) {
		return apiError(error);
	}

	if (tag_ids !== undefined) {
		const effectiveId = newId ?? params.id;

		const { data: existingTags, error: fetchError } = await supabase
			.from('word_tags')
			.select('tag_id')
			.eq('word_id', effectiveId);

		if (fetchError) {
			return apiError(fetchError);
		}

		const existingTagIds = (existingTags ?? []).map((t) => t.tag_id);
		const toRemove = existingTagIds.filter((id) => !tag_ids.includes(id));
		const toAdd = tag_ids.filter((id: number) => !existingTagIds.includes(id));

		if (existingTagIds.length - toRemove.length + toAdd.length === 0) {
			return json({ error: 'Word must have at least one tag' }, { status: 400 });
		}

		if (toRemove.length > 0) {
			const { error: delError } = await supabase
				.from('word_tags')
				.delete()
				.eq('word_id', effectiveId)
				.in('tag_id', toRemove);
			if (delError) {
				return apiError(delError);
			}
		}

		if (toAdd.length > 0) {
			const { error: insError } = await supabase
				.from('word_tags')
				.insert(toAdd.map((tag_id: number) => ({ word_id: effectiveId, tag_id })));
			if (insError) {
				return apiError(insError);
			}
		}
	}

	return json({ success: true });
};
