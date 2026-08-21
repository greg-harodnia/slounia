import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';
import { CACHE_TTL } from '$lib/constants';
export const GET: RequestHandler = async ({ url }) => {
	const wordIdsParam = url.searchParams.get('words') ?? '';
	const translationIdsParam = url.searchParams.get('translations') ?? '';
	const postSlugsParam = url.searchParams.get('posts') ?? '';

	const wordIds = wordIdsParam.split(',').filter(Boolean);
	const translationIds = translationIdsParam
		.split(',')
		.filter(Boolean)
		.map(Number)
		.filter((n) => !Number.isNaN(n));
	const postSlugs = postSlugsParam.split(',').filter(Boolean);

	if (wordIds.length === 0 && translationIds.length === 0 && postSlugs.length === 0) {
		return json({ words: {}, translations: {}, posts: {} });
	}

	const [wordResult, translationResult, postResult] = await Promise.all([
		wordIds.length > 0 ? supabase.from('words').select('id, likes').in('id', wordIds) : { data: null, error: null },
		translationIds.length > 0
			? supabase.from('translations').select('id, likes').in('id', translationIds)
			: { data: null, error: null },
		postSlugs.length > 0
			? supabase.from('posts').select('slug, likes').in('slug', postSlugs)
			: { data: null, error: null },
	]);

	if (wordResult.error) return apiError(wordResult.error);
	if (translationResult.error) return apiError(translationResult.error);
	if (postResult.error) return apiError(postResult.error);

	const words: Record<string, number> = {};
	for (const row of wordResult.data ?? []) {
		words[row.id] = row.likes;
	}

	const translations: Record<string, number> = {};
	for (const row of translationResult.data ?? []) {
		translations[row.id] = row.likes;
	}

	const posts: Record<string, number> = {};
	for (const row of postResult.data ?? []) {
		posts[row.slug] = row.likes;
	}

	// Counts are public and the response depends only on the requested ids, so
	// it is edge-cacheable per URL; a like toggle always returns its own fresh
	// count, so at most this shortens how often passive counts refresh.
	return json(
		{ words, translations, posts },
		{
			headers: {
				'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`,
			},
		},
	);
};
