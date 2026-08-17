import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchWordsPage } from '$lib/server/fetch-words';
import { apiError } from '$lib/server/utils';
import { DEFAULT_ORDER, DEFAULT_SORT, PAGE_SIZE } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
	// include_hidden is a dev-only escape hatch for the dev_mode admin list;
	// it is never honored in production (hidden words are RLS-blocked there).
	const includeHidden = !import.meta.env.PROD && url.searchParams.get('include_hidden') === 'true';

	try {
		const result = await fetchWordsPage({
			search: url.searchParams.get('search') || '',
			sort: url.searchParams.get('sort') || DEFAULT_SORT,
			order: url.searchParams.get('order') || DEFAULT_ORDER,
			tags: url.searchParams.get('tags') || '',
			offset: Number(url.searchParams.get('offset') || '0'),
			limit: Number(url.searchParams.get('limit') || String(PAGE_SIZE)),
			ids: url.searchParams.getAll('ids'),
			includeHidden,
		});
		return json(result);
	} catch (error) {
		return apiError(error as { message: string });
	}
};
