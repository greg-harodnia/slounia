import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { apiError } from '$lib/server/utils';
import { SITE_NAME } from '$lib/constants';

export const GET: RequestHandler = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const tags = url.searchParams.get('tags') || '';
	const format = url.searchParams.get('format') || 'csv';
	const date = new Date().toISOString().slice(0, 10);

	const { data, error } = await supabase.rpc('get_words', {
		search,
		tag_filter: tags,
		sort_field: 'word',
		sort_dir: 'asc',
		result_offset: 0,
		result_limit: 100000,
	});

	if (error) {
		return apiError(error);
	}

	const result = data as { words: Array<unknown>; total: number };
	const words = (result.words ?? []) as Array<{
		id: string;
		importance: { id: number | null; name: string | null; level: number | null };
		comment: string | null;
		likes: number;
		translations: Array<{
			id: number;
			translation: string;
			comment: string | null;
			likes: number;
		}>;
		tags: string[];
	}>;

	if (format === 'json') {
		const body = JSON.stringify(words, null, 2);
		return new Response(body, {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="export.json"; filename*=UTF-8''${encodeURIComponent(`${SITE_NAME} ${date}.json`)}`,
			},
		});
	}

	const rows: string[][] = [];
	rows.push(['word', 'translation', 'word_comment', 'translation_comment', 'importance']);

	for (const w of words) {
		if (w.translations.length === 0) {
			rows.push([escapeCsv(w.id), '', escapeCsv(w.comment ?? ''), '', String(w.importance?.level ?? '')]);
		} else {
			for (const tr of w.translations) {
				rows.push([
					escapeCsv(w.id),
					escapeCsv(tr.translation),
					escapeCsv(w.comment ?? ''),
					escapeCsv(tr.comment ?? ''),
					String(w.importance?.level ?? ''),
				]);
			}
		}
	}

	const csv = rows.map((r) => r.join(',')).join('\n');
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(`${SITE_NAME} ${date}.csv`)}`,
		},
	});
};

function escapeCsv(val: string): string {
	if (val.includes(',') || val.includes('"') || val.includes('\n')) {
		return `"${val.replace(/"/g, '""')}"`;
	}
	return val;
}
