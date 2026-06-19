import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
	const token = url.searchParams.get('token');
	const name = url.searchParams.get('name');
	const telegram = url.searchParams.get('telegram');

	let ipAddress: string | null = null;
	try {
		ipAddress = getClientAddress();
	} catch {
		// client address unavailable
	}

	if (!token && !name && !telegram && !ipAddress) {
		return json({ banned: false });
	}

	const orParts: string[] = [];
	if (token) orParts.push(`user_token.eq.${token}`);
	if (name) orParts.push(`name.eq.${name}`);
	if (telegram) orParts.push(`telegram.eq.${telegram}`);
	if (ipAddress) orParts.push(`ip_address.eq.${ipAddress}`);

	const { data, error } = await supabase
		.from('banned_users')
		.select('id, reason, created_at')
		.or(orParts.join(','))
		.order('created_at', { ascending: false })
		.limit(1);

	if (error) {
		console.error('Ban check error:', error);
		return json({ banned: false });
	}

	if (data && data.length > 0) {
		return json({
			banned: true,
			reason: data[0].reason || 'Ваша ўліковая запіс заблякаваная.',
			bannedAt: data[0].created_at,
		});
	}

	return json({ banned: false });
};
