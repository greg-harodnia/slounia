import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError, requireDev } from '$lib/server/utils';

export const GET: RequestHandler = async ({ url: _url }) => {
	const devErr = requireDev();
	if (devErr) return devErr;

	const { data, error } = await supabase
		.from('banned_users')
		.select('*, messages!message_id(name, telegram, message)')
		.order('created_at', { ascending: false });

	if (error) return apiError(error);
	return json(data);
};

export const POST: RequestHandler = async ({ request }) => {
	const devErr = requireDev();
	if (devErr) return devErr;

	const body = await request.json();
	const { userToken, name, telegram, reason, messageId } = body;

	if (!userToken && !name && !telegram) {
		return json({ error: 'Патрэбны хаця б адзін ідэнтыфікатар (user_token, name або telegram)' }, { status: 400 });
	}

	let ipAddress: string | null = null;
	if (messageId) {
		const { data: msg } = await supabase.from('messages').select('ip_address').eq('id', messageId).limit(1);
		if (msg && msg.length > 0) {
			ipAddress = msg[0].ip_address;
		}
	}

	const updateData: Record<string, unknown> = {
		name: name || null,
		telegram: telegram || null,
		reason: reason || null,
		message_id: messageId || null,
		ip_address: ipAddress,
	};

	if (userToken) {
		const { data: existing } = await supabase
			.from('banned_users')
			.select('id')
			.eq('user_token', userToken)
			.limit(1);

		if (existing && existing.length > 0) {
			const { error } = await supabase.from('banned_users').update(updateData).eq('user_token', userToken);

			if (error) return apiError(error);
			return json({ ok: true, updated: true });
		}
	}

	const { error } = await supabase.from('banned_users').insert({
		user_token: userToken || null,
		...updateData,
	});

	if (error) return apiError(error);
	return json({ ok: true });
};

export const PUT: RequestHandler = async ({ request }) => {
	const devErr = requireDev();
	if (devErr) return devErr;

	const body = await request.json();
	const { id, reason } = body;

	if (!id) {
		return json({ error: 'Патрэбны id бану' }, { status: 400 });
	}

	const { error } = await supabase
		.from('banned_users')
		.update({ reason: reason || null })
		.eq('id', id);

	if (error) return apiError(error);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const devErr = requireDev();
	if (devErr) return devErr;

	const body = await request.json();
	const { id } = body;

	if (!id) {
		return json({ error: 'Патрэбны id бану' }, { status: 400 });
	}

	const { error } = await supabase.from('banned_users').delete().eq('id', id);

	if (error) return apiError(error);
	return json({ ok: true });
};
