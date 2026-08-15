import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';
import { apiError } from '$lib/server/utils';
import type { Suggestion } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token') || null;
	const supabase = getServiceClient();

	const { data, error } = await supabase.from('suggestions').select('*').order('published_at', { ascending: false });

	if (error) return apiError(error);

	// user_token is private: strip it from the public response, only tell the
	// client whether the suggestion belongs to the requesting device.
	const suggestions = ((data ?? []) as (Suggestion & { user_token: string | null })[]).map(
		({ user_token, ...rest }) => ({
			...rest,
			is_mine: !!token && user_token === token,
		}),
	);

	return json(suggestions);
};

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	const body = await request.json();
	const { word, translation, comment, userToken } = body;

	if (!word?.trim() || !translation?.trim()) {
		return json({ error: 'Запоўніце абавязковыя палі' }, { status: 400 });
	}

	const supabase = getServiceClient();

	const { error } = await supabase.from('suggestions').insert({
		word: word.trim(),
		translation: translation.trim(),
		comment: comment?.trim() || null,
		user_token: userToken || null,
	});

	if (error) return apiError(error);
	return json({ ok: true });
};
