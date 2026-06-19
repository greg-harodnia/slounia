export async function load({ url }) {
	const refCode = url.searchParams.get('ref');
	if (refCode) {
		try {
			const { supabase } = await import('$lib/server/db');
			await supabase.rpc('increment_referral', { ref_code: refCode });
		} catch {
			// referral tracking is non-critical
		}
	}
}
