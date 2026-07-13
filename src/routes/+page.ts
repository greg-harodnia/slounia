export function load({ url }) {
	const search = url.searchParams.get('search') || '';
	const sort = url.searchParams.get('sort') || (import.meta.env.PROD ? 'word' : 'created_at');
	const order = url.searchParams.get('order') || (import.meta.env.PROD ? 'asc' : 'desc');
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
