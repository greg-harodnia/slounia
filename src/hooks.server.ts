import type { Handle } from '@sveltejs/kit';
import { getServiceClient } from '$lib/server/db';
import { CACHE_TTL } from '$lib/constants';

const ASSET_RE = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|mp4|webm)$/;
const BAN_REFRESH_MS = 60_000; // refresh ban list every 60s

let bannedTokens = new Map<string, string | null>();
let bannedIps = new Map<string, string | null>();
let lastBanRefresh = 0;

async function refreshBanList() {
	const now = Date.now();
	if (now - lastBanRefresh < BAN_REFRESH_MS) return;
	lastBanRefresh = now;

	// banned_users has RLS enabled with no anon SELECT policy, so reads must go
	// through the service client (which bypasses RLS).
	const { data } = await getServiceClient().from('banned_users').select('user_token, ip_address, reason');
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

	// Refresh ban list in background (fire-and-forget) so page render
	// is never blocked by a Supabase round-trip.
	// NOTE: this means the ban check below uses a potentially stale set.
	// On Vercel cold starts (empty set) or right after the 60 s refresh
	// window expires, a banned user may slip through on their first request.
	refreshBanList();

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

	// Default edge cache for content pages. Routes that set their own
	// Cache-Control (e.g. the 12h homepage cache or 7-day sitemap) keep it —
	// only pages without an explicit policy fall back to this default, and
	// error responses are never cached.
	if (
		event.request.method === 'GET' &&
		!event.locals.banned &&
		response.status >= 200 &&
		response.status < 400 &&
		!response.headers.get('cache-control') &&
		!response.headers.get('content-type')?.startsWith('application/json')
	) {
		response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`);
	}

	return response;
};
