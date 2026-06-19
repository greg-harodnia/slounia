import { json } from '@sveltejs/kit';

export function requireDev() {
	if (import.meta.env.PROD) {
		return json({ error: 'Not available in production' }, { status: 404 });
	}
	return null;
}

export function apiError(error: { message: string }, status = 500) {
	return json({ error: error.message }, { status });
}
