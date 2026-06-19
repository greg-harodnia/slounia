import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { slug, title, content, hashtags, is_pinned, published_at } = body;

	if (!slug || !title || !content) {
		return json({ error: 'slug, title and content are required' }, { status: 400 });
	}

	const { error: insertError } = await supabase.from('posts').insert({
		slug,
		title,
		content,
		hashtags: hashtags || [],
		is_pinned: is_pinned || false,
		published_at: published_at || new Date().toISOString(),
	});

	if (insertError) {
		if (insertError.code === '23505') {
			return json({ error: `Post with slug "${slug}" already exists` }, { status: 409 });
		}
		return apiError(insertError);
	}

	return json({ success: true });
};
