import { DEFAULT_ORDER, DEFAULT_SORT } from '$lib/constants';

export function load({ url }) {
	const search = url.searchParams.get('search') || '';
	const sort = url.searchParams.get('sort') || DEFAULT_SORT;
	const order = url.searchParams.get('order') || DEFAULT_ORDER;
	const tagsParam = url.searchParams.get('tags') || '';

	let selectedTags: string[];
	if (tagsParam) {
		selectedTags = tagsParam.split(',');
	} else {
		selectedTags = [];
	}

	return {
		words: [],
		total: 0,
		pinnedWords: [],
		search,
		sort,
		order,
		selectedTags,
		triggerIndex: -1,
	};
}
