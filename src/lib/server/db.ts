import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

// NOTE: this module is imported by the SSR bundle, so it must only ever be
// evaluated on Node >= 22 (Vercel: nodejs24.x, local: .node-version). supabase-js
// always builds a RealtimeClient, and realtime-js eagerly resolves a WebSocket
// implementation while doing so — on Node < 22 there is no global `WebSocket` and
// it throws, which breaks every SSR page and `vite build`. We never use realtime
// here (REST only), but the client is still constructed. See docs/PROJECT.md.
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
