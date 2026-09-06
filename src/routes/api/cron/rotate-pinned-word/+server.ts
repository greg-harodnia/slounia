import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceClient } from '$lib/server/db';

// Importance ids of the two worst levels: 5 (💀 / Паўсюдны жах) and
// 4 (Жах). The weekly rotation pins two random words from this union.
const TOP_IMPORTANCE_IDS = [5, 4];
const PIN_COUNT = 2;

export const GET: RequestHandler = async ({ request }) => {
	// NOTE: no CRON_SECRET check — these headers are spoofable, so anyone who
	// knows the URL can trigger the rotation. To harden: set a CRON_SECRET env
	// var in Vercel and verify `Authorization: Bearer <CRON_SECRET>` here.
	const isVercelCron =
		request.headers.get('user-agent') === 'vercel-cron/1.0' ||
		request.headers.get('x-vercel-cron-schedule') !== null ||
		request.headers.get('x-vercel-cron-auth-token') !== null ||
		request.headers.get('x-vercel-cron') !== null;
	if (!isVercelCron) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = getServiceClient();

	const { error: unpinError } = await supabase
		.from('words')
		.update({ is_pinned: false, pinned_at: null })
		.eq('is_pinned', true);

	if (unpinError) {
		return json({ error: unpinError.message }, { status: 500 });
	}

	const { data: words, error: fetchError } = await supabase
		.from('words')
		.select('id')
		.in('importance_id', TOP_IMPORTANCE_IDS);

	if (fetchError) {
		return json({ error: fetchError.message }, { status: 500 });
	}

	if (!words || words.length === 0) {
		return json({ message: 'No words with importance level 4 or 5 found', pinned: [] });
	}

	const shuffled = [...words];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	const chosen = shuffled.slice(0, Math.min(PIN_COUNT, shuffled.length));

	const { error: pinError } = await supabase
		.from('words')
		.update({ is_pinned: true, pinned_at: new Date().toISOString() })
		.in(
			'id',
			chosen.map((w) => w.id),
		);

	if (pinError) {
		return json({ error: pinError.message }, { status: 500 });
	}

	return json({ success: true, pinned: chosen.map((w) => w.id) });
};
