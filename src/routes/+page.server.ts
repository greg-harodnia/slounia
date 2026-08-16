import { dev } from '$app/environment';
import { CACHE_TTL_PAGE } from '$lib/constants';
import { fetchAllWords } from '$lib/server/fetch-words';
import type { WordData } from '$lib/types';

export async function load({ url, setHeaders }) {
	// The homepage HTML (the full word list) is identical for every visitor,
	// so let Vercel serve it from the edge cache. Ref links must stay dynamic
	// to count each visit.
	if (!url.searchParams.has('ref')) {
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
		// In dev builds load the full list including hidden words in one pass;
		// in prod hidden words never leave the DB.
		({ words } = await fetchAllWords(dev));
	} catch (e) {
		console.error(e);
	}
	await refPromise;

	return { words };
}
