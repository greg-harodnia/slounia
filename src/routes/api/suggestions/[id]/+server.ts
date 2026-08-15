import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

// Users may only delete their own suggestions (matched by user_token). In dev
// mode an admin can delete any suggestion.
export const DELETE: RequestHandler = async ({ params, request }) => {
	const isAdmin = !import.meta.env.PROD;
	const { userToken } = await request.json().catch(() => ({}));

	if (!isAdmin && !userToken) {
		return json({ error: 'Няма доступу' }, { status: 403 });
	}

	const supabase = getServiceClient();

	if (!isAdmin) {
		const { data, error } = await supabase
			.from('suggestions')
			.delete()
			.eq('id', params.id)
			.eq('user_token', userToken)
			.select();
		if (error) return apiError(error);
		if (!data || data.length === 0) {
			return json({ error: 'Прапанова ня знойдзеная' }, { status: 404 });
		}
		return json({ success: true });
	}

	const { error } = await supabase.from('suggestions').delete().eq('id', params.id);
	if (error) return apiError(error);
	return json({ success: true });
};
