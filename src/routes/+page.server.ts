export async function load({ url }) {
	const refCode = url.searchParams.get('ref');
	if (refCode) {
		try {
			const { getServiceClient } = await import('$lib/server/db');
			await getServiceClient().rpc('increment_referral', { ref_code: refCode });
		} catch {
			// referral tracking is non-critical
		}
	}
}
