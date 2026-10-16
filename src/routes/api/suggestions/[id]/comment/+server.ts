import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';
import { apiError, requireDev } from '$lib/server/utils';

// The single admin comment attached to a suggestion. Admin = dev mode only
// (requireDev returns 404 in production). PUT creates or overwrites the
// comment; DELETE clears it. The comment is public: GET /api/suggestions
// returns it to every viewer.
export const PUT: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json().catch(() => ({}));
	const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

	if (!comment) {
		return json({ error: 'Камэнтар ня можа быць пустым' }, { status: 400 });
	}

	const supabase = getServiceClient();

	const { data, error } = await supabase
		.from('suggestions')
		.update({ admin_comment: comment })
		.eq('id', params.id)
		.select('id')
		.maybeSingle();

	if (error) return apiError(error);
	if (!data) return json({ error: 'Прапанова ня знойдзеная' }, { status: 404 });

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const supabase = getServiceClient();

	const { data, error } = await supabase
		.from('suggestions')
		.update({ admin_comment: null })
		.eq('id', params.id)
		.select('id')
		.maybeSingle();

	if (error) return apiError(error);
	if (!data) return json({ error: 'Прапанова ня знойдзеная' }, { status: 404 });

	return json({ success: true });
};
