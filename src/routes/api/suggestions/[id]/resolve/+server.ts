import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';
import { apiError, requireDev } from '$lib/server/utils';
import type { SuggestionStatus } from '$lib/types';

const VALID_STATUSES: SuggestionStatus[] = ['pending', 'approved', 'rejected', 'agreed'];

export const PUT: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { status } = body;

	if (!VALID_STATUSES.includes(status)) {
		return json({ error: 'Няслушны статус' }, { status: 400 });
	}

	const supabase = getServiceClient();

	const { error } = await supabase.from('suggestions').update({ status }).eq('id', params.id);

	if (error) return apiError(error);
	return json({ success: true });
};
