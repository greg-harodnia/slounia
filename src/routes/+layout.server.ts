import type { LayoutServerLoad } from './$types';
import type { TagData } from '$lib/types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { supabase } = await import('$lib/server/db');
	const { data } = await supabase.from('tags').select('id, name');

	return {
		banned: locals.banned ?? false,
		banReason: locals.banReason ?? null,
		tags: (data ?? []) as TagData[],
	};
};
