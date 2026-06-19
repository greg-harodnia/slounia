import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const { reply } = body;
	const id = Number(params.id);

	if (!reply?.trim()) {
		return json({ error: 'Адказ не можа быць пустым' }, { status: 400 });
	}

	const { error } = await supabase.from('messages').update({ reply: reply.trim() }).eq('id', id);

	if (error) {
		return apiError(error);
	}

	return json({ ok: true });
};
