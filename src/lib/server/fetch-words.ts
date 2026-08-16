import { supabase } from '$lib/server/db';
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
	includePinned?: boolean;
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
	const includePinned = params.includePinned ?? false;

	const mainPromise = supabase.rpc('get_words', {
		search,
		tag_filter: tags,
		sort_field: sort,
		sort_dir: order,
		result_offset: offset,
		result_limit: limit,
		word_ids: ids.length > 0 ? ids : null,
		include_hidden: includeHidden,
	});

	const pinnedPromise = includePinned
		? supabase.rpc('get_words', {
				search: '',
				tag_filter: '',
				sort_field: 'pinned_at',
				sort_dir: 'desc',
				result_offset: 0,
				result_limit: FULL_LIST_LIMIT,
				word_ids: null,
				include_hidden: true,
				pinned_only: true,
			})
		: null;

	const [mainResult, pinnedResult] =
		pinnedPromise !== null ? await Promise.all([mainPromise, pinnedPromise]) : [await mainPromise, null];

	if (mainResult.error) throw mainResult.error;

	let pinnedWords: WordData[] = [];
	if (pinnedResult && !pinnedResult.error) {
		const result = pinnedResult.data as { words: WordData[] } | null;
		pinnedWords = result?.words ?? [];
	}

	const result = mainResult.data as { words: WordData[]; total: number };
	return { words: result.words ?? [], total: result.total ?? 0, pinnedWords };
}

// The whole dictionary in one call (used by the homepage SSR load). Pinned
// words (is_pinned) are regular words that happen to be promoted — they are
// never hidden, so a single include_hidden: false query already returns them;
// the pinned section is derived client-side from the same list.
export function fetchAllWords(includeHidden = false) {
	return fetchWordsPage({ offset: 0, limit: FULL_LIST_LIMIT, includeHidden });
}
