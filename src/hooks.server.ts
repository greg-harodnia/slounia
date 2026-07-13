import type { Handle } from '@sveltejs/kit';
import { supabase } from '$lib/server/db';

const ASSET_RE = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|mp4|webm)$/;
const CACHE_TTL = 604800; // 7 days, in seconds
const BAN_REFRESH_MS = 60_000; // refresh ban list every 60s

let bannedTokens = new Map<string, string | null>();
let bannedIps = new Map<string, string | null>();
let lastBanRefresh = 0;

async function refreshBanList() {
	const now = Date.now();
	if (now - lastBanRefresh < BAN_REFRESH_MS) return;
	lastBanRefresh = now;

	const { data } = await supabase.from('banned_users').select('user_token, ip_address, reason');
	if (!data) return;

	const tokens = new Map<string, string | null>();
	const ips = new Map<string, string | null>();
	for (const row of data) {
		if (row.user_token) tokens.set(row.user_token, row.reason ?? null);
		if (row.ip_address) ips.set(row.ip_address, row.reason ?? null);
	}
	bannedTokens = tokens;
	bannedIps = ips;
}

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

	await refreshBanList();

	let reason: string | null = null;
	if (token && bannedTokens.has(token)) {
		reason = bannedTokens.get(token) ?? 'Доступ забаронены';
	} else if (ipAddress && bannedIps.has(ipAddress)) {
		reason = bannedIps.get(ipAddress) ?? 'Доступ забаронены';
	}

	if (reason !== null) {
		if (event.url.pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: reason }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		event.locals.banned = true;
		event.locals.banReason = reason;
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
