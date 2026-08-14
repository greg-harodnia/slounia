import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runAssist, AssistRateLimitError } from '$lib/server/assist';
import { MAX_MESSAGES, MAX_TEXT_CHARS, type ChatMessage } from '$lib/server/assist-core';

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

export const POST: RequestHandler = async ({ request }) => {
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
