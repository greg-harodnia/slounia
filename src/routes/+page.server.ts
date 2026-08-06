import { DEFAULT_ORDER, DEFAULT_SORT, PAGE_SIZE } from '$lib/constants';
import { fetchWordsPage } from '$lib/server/fetch-words';
import type { TagData, WordData } from '$lib/types';

export async function load({ url, parent }) {
	const search = url.searchParams.get('search') || '';
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');
	const tagsParam = url.searchParams.get('tags') || '';

	const sort = search && !sortParam ? 'relevance' : sortParam || DEFAULT_SORT;
	const order = search && !sortParam ? 'desc' : orderParam || DEFAULT_ORDER;

	const refCode = url.searchParams.get('ref');
	const refPromise = refCode
		? import('$lib/server/db')
				.then(({ getServiceClient }) => getServiceClient().rpc('increment_referral', { ref_code: refCode }))
				.catch(() => {
					// referral tracking is non-critical
				})
		: Promise.resolve();

	let words: WordData[] = [];
	let total = 0;
	let pinnedWords: WordData[] = [];

	try {
		const [{ tags }] = await Promise.all([parent(), refPromise]);
		const tagList = (tags ?? []) as TagData[];
		const selectedTags = tagsParam ? tagsParam.split(',') : tagList.map((t) => t.name);
		const includePinned =
			selectedTags.length === tagList.length && sort === DEFAULT_SORT && order === DEFAULT_ORDER;

		({ words, total, pinnedWords } = await fetchWordsPage({
			search,
			sort,
			order,
			tags: selectedTags.join(','),
			offset: 0,
			limit: PAGE_SIZE,
			includeHidden: false,
			includePinned,
		}));
	} catch (e) {
		console.error(e);
	}

	return { words, total, pinnedWords };
}
