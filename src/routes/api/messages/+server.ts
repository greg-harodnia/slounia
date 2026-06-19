import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';

export const POST: RequestHandler = async (event) => {
	const { request, getClientAddress } = event;
	const body = await request.json();
	const { name, telegram, message, userToken } = body;

	if (!name?.trim() || !message?.trim()) {
		return json({ error: 'Запоўніце абавязковыя палі' }, { status: 400 });
	}

	const nameTrimmed = name.trim();
	const telegramTrimmed = telegram?.trim() || null;

	let ipAddress: string | null = null;
	try {
		ipAddress = getClientAddress();
	} catch {
		// client address unavailable
	}

	const orFilters = [`name.eq.${nameTrimmed}`];
	if (telegramTrimmed) orFilters.push(`telegram.eq.${telegramTrimmed}`);
	if (userToken) orFilters.push(`user_token.eq.${userToken}`);
	if (ipAddress) orFilters.push(`ip_address.eq.${ipAddress}`);

	const { data: banned } = await supabase.from('banned_users').select('id, reason').or(orFilters.join(',')).limit(1);

	if (banned && banned.length > 0) {
		return json(
			{
				error: banned[0].reason || 'Доступ забаранёны.',
			},
			{ status: 403 },
		);
	}

	const { error } = await supabase.from('messages').insert({
		name: nameTrimmed,
		telegram: telegramTrimmed,
		message: message.trim(),
		user_token: userToken || null,
		ip_address: ipAddress,
	});

	if (error) {
		return apiError(error);
	}

	return json({ ok: true });
};

export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	const admin = url.searchParams.get('admin');

	if (admin === 'true') {
		const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });

		if (error) return apiError(error);
		return json(data);
	}

	if (!token) {
		return json([]);
	}

	const { data, error } = await supabase
		.from('messages')
		.select('*')
		.eq('user_token', token)
		.not('reply', 'is', null)
		.order('created_at', { ascending: false });

	if (error) return apiError(error);
	return json(data);
};
