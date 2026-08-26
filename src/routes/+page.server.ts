import { CACHE_TTL_PAGE, FULL_LIST_LIMIT } from '$lib/constants';

export async function load({ url, setHeaders }) {
	// The homepage word list is identical for every visitor, so let Vercel
	// serve it from the edge cache. Ref links must stay dynamic to count
	// each visit, so they are never cached.
	if (url.searchParams.has('ref')) {
		setHeaders({ 'Cache-Control': 'no-store' });
	} else {
		setHeaders({
			'Cache-Control': `public, s-maxage=${CACHE_TTL_PAGE}, stale-while-revalidate=${CACHE_TTL_PAGE}`,
		});
	}

	const refCode = url.searchParams.get('ref');
	if (refCode) {
		import('$lib/server/db')
			.then(({ getServiceClient }) => getServiceClient().rpc('increment_referral', { ref_code: refCode }))
			.catch(() => {});
	}

	// Fetch the full dictionary from /api/words (CDN-cached) so words
	// render in the initial HTML. This eliminates the client-side fetch
	// round-trip and the loading spinner on cold visits.
	try {
		const apiRes = await fetch(`${url.origin}/api/words?limit=${FULL_LIST_LIMIT}`);
		if (apiRes.ok) {
			const data = await apiRes.json();
			return { words: data.words ?? [] };
		}
	} catch {
		// Non-critical; the client will retry via fetchWords().
	}

	return { words: [] };
}
