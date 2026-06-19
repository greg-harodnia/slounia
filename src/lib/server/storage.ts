import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

const key = env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;

export function getStorageClient() {
	if (!key) {
		throw new Error('PRIVATE_SUPABASE_SERVICE_ROLE_KEY is not set — image uploads are unavailable');
	}
	return createClient(PUBLIC_SUPABASE_URL, key);
}
