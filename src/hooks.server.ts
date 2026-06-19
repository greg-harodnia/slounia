import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/server/db';

const ASSET_RE = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|mp4|webm)$/;
const CACHE_TTL = 43200; // 12 hours, in seconds

export const handle: Handle = async ({ event, resolve }) => {
	if (ASSET_RE.test(event.url.pathname)) {
		return resolve(event);
	}

	const token = event.cookies.get('user_token');

	let ipAddress: string | null = null;
	try {
		ipAddress = event.getClientAddress();
	} catch {
		// client address unavailable (e.g. Vercel dev)
	}

	const orParts: string[] = [];
	if (token) orParts.push(`user_token.eq.${token}`);
	if (ipAddress) orParts.push(`ip_address.eq.${ipAddress}`);

	if (orParts.length > 0) {
		const { data } = await supabase.from('banned_users').select('id, reason').or(orParts.join(',')).limit(1);

		if (data && data.length > 0) {
			if (event.url.pathname.startsWith('/api/')) {
				return new Response(JSON.stringify({ error: data[0].reason || 'Доступ забаронены' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			event.locals.banned = true;
			event.locals.banReason = data[0].reason || null;
		}
	}

	const response = await resolve(event);

	if (
		event.request.method === 'GET' &&
		!event.locals.banned &&
		!response.headers.get('content-type')?.startsWith('application/json')
	) {
		response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`);
	}

	return response;
};
