import { supabase, getServiceClient } from '$lib/server/db';
import { DEFAULT_ORDER, DEFAULT_SORT, FULL_LIST_LIMIT, PAGE_SIZE } from '$lib/constants';
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

// The whole dictionary in one call (used by the homepage SSR load). Pinned
// words (is_pinned) are regular words that happen to be promoted — they are
// never hidden, so a single include_hidden: false query already returns them;
// the pinned section is derived client-side from the same list.
export function fetchAllWords(includeHidden = false) {
	return fetchWordsPage({ offset: 0, limit: FULL_LIST_LIMIT, includeHidden });
}
