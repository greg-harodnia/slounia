import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/db';
import { requireDev, apiError } from '$lib/server/utils';

export const PUT: RequestHandler = async ({ params, request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const body = await request.json();
	const { slug, title, content, hashtags, is_pinned, published_at } = body;

	const updates: Record<string, unknown> = {};
	if (slug !== undefined) updates.slug = slug;
	if (title !== undefined) updates.title = title;
	if (content !== undefined) updates.content = content;
	if (hashtags !== undefined) updates.hashtags = hashtags;
	if (is_pinned !== undefined) updates.is_pinned = is_pinned;
	if (published_at !== undefined) updates.published_at = published_at;
	updates.updated_at = new Date().toISOString();

	const { error: updateError } = await supabase.from('posts').update(updates).eq('slug', params.slug);

	if (updateError) {
		return apiError(updateError);
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	const { error: deleteError } = await supabase.from('posts').delete().eq('slug', params.slug);

	if (deleteError) {
		return apiError(deleteError);
	}

	return json({ success: true });
};
