import { describe, expect, it } from 'vitest';
import { parseRetryAfter } from '../assist-core';

function resWithRetryAfter(value: string | null): Response {
	const headers = new Headers();
	if (value !== null) headers.set('retry-after', value);
	return new Response(null, { headers });
}

describe('parseRetryAfter', () => {
	it('parses a plain number of seconds', () => {
		expect(parseRetryAfter(resWithRetryAfter('30'))).toBe(30);
	});

	it('returns undefined when the header is absent', () => {
		expect(parseRetryAfter(resWithRetryAfter(null))).toBeUndefined();
	});

	it('parses an HTTP-date as seconds until that moment', () => {
		const future = new Date(Date.now() + 5000).toUTCString();
		const seconds = parseRetryAfter(resWithRetryAfter(future));
		expect(seconds).toBeGreaterThanOrEqual(4);
		expect(seconds).toBeLessThanOrEqual(6);
	});

	it('returns undefined for garbage values', () => {
		expect(parseRetryAfter(resWithRetryAfter('tomorrow'))).toBeUndefined();
	});

	it('never returns negative delays', () => {
		const past = new Date(Date.now() - 5000).toUTCString();
		expect(parseRetryAfter(resWithRetryAfter(past))).toBe(0);
		expect(parseRetryAfter(resWithRetryAfter('-3'))).toBe(0);
	});
});
