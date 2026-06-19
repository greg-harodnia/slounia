import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorageClient } from '$lib/server/storage';
import { requireDev, apiError } from '$lib/server/utils';

export const POST: RequestHandler = async ({ request }) => {
	const devBlock = requireDev();
	if (devBlock) return devBlock;

	let supabase: ReturnType<typeof getStorageClient>;
	try {
		supabase = getStorageClient();
	} catch {
		return json({ error: 'Storage not configured' }, { status: 500 });
	}

	const formData = await request.formData();
	const file = formData.get('image') as File | null;

	if (!file) {
		return json({ error: 'No image provided' }, { status: 400 });
	}

	const ext = file.name.split('.').pop() || 'png';
	const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

	const { error: uploadError } = await supabase.storage.from('blog-images').upload(fileName, file, {
		contentType: file.type,
		upsert: false,
	});

	if (uploadError) {
		return apiError(uploadError);
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from('blog-images').getPublicUrl(fileName);

	return json({ url: publicUrl });
};
