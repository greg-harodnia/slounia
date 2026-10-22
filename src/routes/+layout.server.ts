import type { LayoutServerLoad } from './$types';
import type { TagData } from '$lib/types';

export const load: LayoutServerLoad = async () => {
	const { supabase } = await import('$lib/server/db');
	const { data } = await supabase.from('tags').select('id, name');

	return {
		tags: (data ?? []) as TagData[],
	};
};
