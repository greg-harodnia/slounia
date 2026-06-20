import { PAGE_SIZE } from '$lib/constants';
import type { TagData } from '$lib/types';

export async function load({ url, fetch }) {
	const search = url.searchParams.get('search') || '';
	const sort = url.searchParams.get('sort') || (import.meta.env.PROD ? 'word' : 'created_at');
	const order = url.searchParams.get('order') || (import.meta.env.PROD ? 'asc' : 'desc');
	const tagsParam = url.searchParams.get('tags') || '';
	const ids = url.searchParams.getAll('ids').filter(Boolean);

	const isCleanLoad =
		!url.searchParams.has('search') &&
		!url.searchParams.has('tags') &&
		!url.searchParams.has('sort') &&
		!url.searchParams.has('order');

	const params = new URLSearchParams();
	params.set('search', search);
	params.set('sort', sort);
	params.set('order', order);
	if (tagsParam) params.set('tags', tagsParam);
	params.set('offset', '0');
	params.set('limit', String(PAGE_SIZE));
	for (const id of ids) params.append('ids', id);
	if (isCleanLoad) params.set('include_pinned', 'true');

	const [wordsRes, tagsRes] = await Promise.all([fetch(`/api/words?${params}`), fetch('/api/tags')]);

	const tags: TagData[] = tagsRes.ok ? await tagsRes.json() : [];

	const wordsData = wordsRes.ok ? await wordsRes.json() : { words: [], total: 0 };

	let selectedTags: string[];
	if (tagsParam) {
		selectedTags = tagsParam.split(',');
	} else if (tags.length > 0) {
		selectedTags = tags.map((t) => t.name);
	} else {
		selectedTags = [];
	}

	return {
		words: wordsData.words ?? [],
		total: wordsData.total ?? 0,
		pinnedWords: wordsData.pinnedWords ?? [],
		tags,
		search,
		sort,
		order,
		selectedTags,
		triggerIndex: -1,
		_fromCache: false as const,
	};
}
