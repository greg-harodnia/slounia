import { supabase, getServiceClient } from '$lib/server/db';
import { DEFAULT_ORDER, DEFAULT_SORT, PAGE_SIZE } from '$lib/constants';
import { latToCyr } from '$lib/lacinka';
import type { WordData } from '$lib/types';

export interface WordsPageParams {
	search?: string;
	sort?: string;
	order?: string;
	tags?: string;
	offset?: number;
	limit?: number;
	ids?: string[];
	includeHidden?: boolean;
}

export async function fetchWordsPage(params: WordsPageParams) {
	const search = latToCyr(params.search ?? '');
	const sort = params.sort ?? DEFAULT_SORT;
	const order = params.order ?? DEFAULT_ORDER;
	const tags = params.tags ?? '';
	const offset = params.offset ?? 0;
	const limit = params.limit ?? PAGE_SIZE;
	const ids = (params.ids ?? []).filter(Boolean);
	const includeHidden = params.includeHidden ?? false;

	// Hidden (draft) words are blocked for anon by RLS, so including them
	// requires the service client. Only dev builds request them (the API
	// route gates include_hidden behind dev too).
	const client = includeHidden ? getServiceClient() : supabase;

	const { data, error } = await client.rpc('get_words', {
		search,
		tag_filter: tags,
		sort_field: sort,
		sort_dir: order,
		result_offset: offset,
		result_limit: limit,
		word_ids: ids.length > 0 ? ids : null,
		include_hidden: includeHidden,
	});

	if (error) throw error;

	const result = data as { words: WordData[]; total: number };
	return { words: result.words ?? [], total: result.total ?? 0 };
}

// The homepage SSR payload: the first page plus any pinned words (which may
// live anywhere in the dictionary). Two cheap calls instead of loading the
// whole dictionary — only the returned rows get their translations/tags
// aggregated, so cache-miss renders stay fast. The client fetches the full
// list afterwards, at which point the pinned section is derived from it.
export async function fetchHomepagePreview(includeHidden = false) {
	const client = includeHidden ? getServiceClient() : supabase;
	const [{ data: pinnedRows }, { words: firstPage }] = await Promise.all([
		client.from('words').select('id').eq('is_pinned', true),
		fetchWordsPage({ offset: 0, limit: PAGE_SIZE, includeHidden }),
	]);

	const ids = (pinnedRows ?? []).map((r) => r.id).filter(Boolean);
	const pinned = ids.length > 0 ? (await fetchWordsPage({ ids, limit: ids.length, includeHidden })).words : [];

	const words = firstPage.slice();
	for (const w of pinned) {
		if (!words.some((x) => x.id === w.id)) words.push(w);
	}
	return { words };
}
