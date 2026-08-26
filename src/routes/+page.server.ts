import { CACHE_TTL_PAGE } from '$lib/constants';

export async function load({ url, setHeaders }) {
	// The homepage shell (no word data) is identical for every visitor, so
	// let Vercel serve it from the edge cache. Ref links must stay dynamic
	// to count each visit, so they are never cached.
	if (url.searchParams.has('ref')) {
		setHeaders({ 'Cache-Control': 'no-store' });
	} else {
		setHeaders({
			'Cache-Control': `public, s-maxage=${CACHE_TTL_PAGE}, stale-while-revalidate=${CACHE_TTL_PAGE}`,
		});
	}

	// Word data is NOT SSR'd — the client fetches the full dictionary from
	// /api/words (itself CDN-cached) after hydration. This avoids stale
	// flashes when pinned words change during the 12 h page-cache window.
	const refCode = url.searchParams.get('ref');
	if (refCode) {
		import('$lib/server/db')
			.then(({ getServiceClient }) => getServiceClient().rpc('increment_referral', { ref_code: refCode }))
			.catch(() => {});
	}

	return { words: [] };
}
