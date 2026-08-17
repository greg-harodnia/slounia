import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const GET: RequestHandler = async ({ url }) => {
	const wordIdsParam = url.searchParams.get('words') ?? '';
	const translationIdsParam = url.searchParams.get('translations') ?? '';

	const wordIds = wordIdsParam.split(',').filter(Boolean);
	const translationIds = translationIdsParam
		.split(',')
		.filter(Boolean)
		.map(Number)
		.filter((n) => !Number.isNaN(n));

	if (wordIds.length === 0 && translationIds.length === 0) {
		return json({ words: {}, translations: {} });
	}

	const [wordResult, translationResult] = await Promise.all([
		wordIds.length > 0 ? supabase.from('words').select('id, likes').in('id', wordIds) : { data: null, error: null },
		translationIds.length > 0
			? supabase.from('translations').select('id, likes').in('id', translationIds)
			: { data: null, error: null },
	]);

	if (wordResult.error) return apiError(wordResult.error);
	if (translationResult.error) return apiError(translationResult.error);

	const words: Record<string, number> = {};
	for (const row of wordResult.data ?? []) {
		words[row.id] = row.likes;
	}

	const translations: Record<string, number> = {};
	for (const row of translationResult.data ?? []) {
		translations[row.id] = row.likes;
	}

	return json({ words, translations });
};
