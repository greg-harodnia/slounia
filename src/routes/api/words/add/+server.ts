import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();

	const { id, importance_id, comment, tag_ids, translations } = body;

	if (!id || !translations || translations.length === 0) {
		return json({ error: 'Word and at least one translation are required' }, { status: 400 });
	}

	if (!tag_ids || tag_ids.length === 0) {
		return json({ error: 'At least one tag is required' }, { status: 400 });
	}

	const { error: wordError } = await supabase.from('words').insert({
		id,
		importance_id: importance_id || null,
		comment: comment || null,
	});

	if (wordError) {
		if (wordError.code === '23505') {
			return json({ error: `Word "${id}" already exists` }, { status: 409 });
		}
		return apiError(wordError);
	}

	if (tag_ids && tag_ids.length > 0) {
		const { error: tagError } = await supabase
			.from('word_tags')
			.insert(tag_ids.map((tag_id: number) => ({ word_id: id, tag_id })));

		if (tagError) {
			return apiError(tagError);
		}
	}

	const { error: transError } = await supabase.from('translations').insert(
		translations.map((t: { translation: string; comment?: string; sort_order?: number }, i: number) => ({
			word_id: id,
			translation: t.translation,
			comment: t.comment || null,
			sort_order: t.sort_order ?? i,
		})),
	);

	if (transError) {
		return apiError(transError);
	}

	return json({ success: true });
};
