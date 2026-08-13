import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runAssist, AssistRateLimitError } from '$lib/server/assist';
import { MAX_MESSAGES, MAX_TEXT_CHARS, type ChatMessage } from '$lib/server/assist-core';

const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 20;

// In-memory per-IP rate limit. Vercel serverless instances are ephemeral, so
// this is only a basic abuse guard, not a hard quota.
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const cur = hits.get(ip);
	if (!cur || now > cur.resetAt) {
		hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}
	cur.count += 1;
	return cur.count > MAX_REQUESTS;
}

function isValidMessage(m: unknown): m is ChatMessage {
	if (!m || typeof m !== 'object') return false;
	const msg = m as { role?: unknown; text?: unknown };
	return (
		(msg.role === 'user' || msg.role === 'assistant') &&
		typeof msg.text === 'string' &&
		msg.text.length > 0 &&
		msg.text.length <= MAX_TEXT_CHARS
	);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let ip = 'unknown';
	try {
		ip = getClientAddress();
	} catch {
		// client address unavailable
	}

	if (isRateLimited(ip)) {
		return json({ error: 'Замнога запытаў. Паспрабуйце позьней.' }, { status: 429 });
	}

	let body: { messages?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Няправільны запыт' }, { status: 400 });
	}

	if (!Array.isArray(body.messages)) {
		return json({ error: 'Няправільны запыт' }, { status: 400 });
	}

	const messages = body.messages.filter(isValidMessage).slice(-MAX_MESSAGES);
	if (messages.length === 0) {
		return json({ error: 'Няправільны запыт' }, { status: 400 });
	}

	try {
		const reply = await runAssist(messages);
		return json({ reply });
	} catch (error) {
		if (error instanceof AssistRateLimitError) {
			// Log the provider's explanation (e.g. "daily quota exceeded", "tokens
			// per minute") so the real cause is visible in server logs.
			console.error(`assist rate limited (retry-after ${error.retryAfterSeconds ?? '?'}s): ${error.detail}`);
			return json({ error: 'Замнога запытаў да памочніка. Паспрабуйце позьней.' }, { status: 429 });
		}
		console.error('assist error:', error);
		return json({ error: 'Не ўдалося здабыць адказ. Паспрабуйце позьней.' }, { status: 500 });
	}
};
