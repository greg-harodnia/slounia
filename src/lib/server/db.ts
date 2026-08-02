import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

let serviceClient: SupabaseClient | undefined;

export function getServiceClient() {
	if (!serviceClient) {
		const key = env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;
		if (!key) {
			throw new Error('PRIVATE_SUPABASE_SERVICE_ROLE_KEY is not set');
		}
		serviceClient = createClient(PUBLIC_SUPABASE_URL, key);
	}
	return serviceClient;
}
