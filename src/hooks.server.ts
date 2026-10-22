import type { Handle } from '@sveltejs/kit';
import { CACHE_TTL } from '$lib/constants';

const ASSET_RE = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|mp4|webm)$/;

export const handle: Handle = async ({ event, resolve }) => {
	if (ASSET_RE.test(event.url.pathname)) {
		return resolve(event);
	}

	const response = await resolve(event);

	// Default edge cache for content pages. Routes that set their own
	// Cache-Control (e.g. the 12h homepage cache or 7-day sitemap) keep it —
	// only pages without an explicit policy fall back to this default, and
	// error responses are never cached.
	if (
		event.request.method === 'GET' &&
		response.status >= 200 &&
		response.status < 400 &&
		!response.headers.get('cache-control') &&
		!response.headers.get('content-type')?.startsWith('application/json')
	) {
		response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`);
	}

	return response;
};
