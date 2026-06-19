import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';
import { PAGE_SIZE } from '$lib/constants';
import { latToCyr } from '$lib/lacinka';

export const GET: RequestHandler = async ({ url }) => {
	const search = latToCyr(url.searchParams.get('search') || '');
	const sort = url.searchParams.get('sort') || 'word';
	const order = url.searchParams.get('order') || 'desc';
	const tags = url.searchParams.get('tags') || '';
	const offset = Number(url.searchParams.get('offset') || '0');
	const limit = Number(url.searchParams.get('limit') || String(PAGE_SIZE));
	const ids = url.searchParams.getAll('ids').filter(Boolean);
	const includeHidden = url.searchParams.get('include_hidden') === 'true';

	const { data, error } = await supabase.rpc('get_words', {
		search,
		tag_filter: tags,
		sort_field: sort,
		sort_dir: order,
		result_offset: offset,
		result_limit: limit,
		word_ids: ids.length > 0 ? ids : null,
		include_hidden: includeHidden,
	});

	if (error) {
		return apiError(error);
	}

	const result = data as { words: Array<unknown>; total: number };

	return json({ words: result.words ?? [], total: result.total ?? 0 });
};
