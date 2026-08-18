import { dev } from '$app/environment';
import { CACHE_TTL_PAGE } from '$lib/constants';
import { fetchHomepagePreview } from '$lib/server/fetch-words';
import type { WordData } from '$lib/types';

export async function load({ url, setHeaders }) {
	// The homepage HTML (the full word list) is identical for every visitor,
	// so let Vercel serve it from the edge cache. Ref links must stay dynamic
	// to count each visit, so they are never cached (and the hooks default
	// only applies when no Cache-Control header is already set).
	if (url.searchParams.has('ref')) {
		setHeaders({ 'Cache-Control': 'no-store' });
	} else {
		setHeaders({
			'Cache-Control': `public, s-maxage=${CACHE_TTL_PAGE}, stale-while-revalidate=${CACHE_TTL_PAGE}`,
		});
	}

	const refCode = url.searchParams.get('ref');
	const refPromise = refCode
		? import('$lib/server/db')
				.then(({ getServiceClient }) => getServiceClient().rpc('increment_referral', { ref_code: refCode }))
				.catch(() => {
					// referral tracking is non-critical
				})
		: Promise.resolve();

	let words: WordData[] = [];
	try {
		// A filtered URL (search/sort/order/tags) can't be served by the
		// SSR'd first page, so the client keeps the loading state and fetches
		// the full dictionary after hydration instead.
		if (
			url.searchParams.has('search') ||
			url.searchParams.has('sort') ||
			url.searchParams.has('order') ||
			url.searchParams.has('tags')
		) {
			await refPromise;
			return { words: [] };
		}

		// SSR only the first page + pinned words. Small enough for a fast
		// mobile LCP but still live DB data, so the first paint and crawlers
		// see real content; the client fetches the full dictionary after paint.
		({ words } = await fetchHomepagePreview(dev));
	} catch (e) {
		console.error(e);
	}
	await refPromise;

	return { words };
}
