import { describe, expect, it } from 'vitest';
import {
	extractResponseText,
	extractToolCalls,
	limitMessages,
	makeToolResultMessage,
	resolveProvider,
	toOpenAiMessages,
} from '../assist-core';
import type { OpenAiAssistantMessage } from '../assist-core';

describe('limitMessages', () => {
	it('keeps only the last MAX_MESSAGES messages', () => {
		const messages = Array.from({ length: 50 }, (_, i) => ({ role: 'user' as const, text: `m${i}` }));
		const limited = limitMessages(messages);
		expect(limited).toHaveLength(40);
		expect(limited[0].text).toBe('m10');
	});

	it('truncates long texts', () => {
		const limited = limitMessages([{ role: 'user', text: 'x'.repeat(5000) }]);
		expect(limited[0].text).toHaveLength(4000);
	});
});

describe('toOpenAiMessages', () => {
	it('maps messages to user chat messages', () => {
		const messages = toOpenAiMessages([
			{ role: 'user', text: 'hi' },
			{ role: 'assistant', text: 'hello' },
		]);
		expect(messages).toEqual([
			{ role: 'user', content: 'hi' },
			{ role: 'user', content: 'hello' },
		]);
	});
});

describe('extractToolCalls', () => {
	it('returns an empty array when there are no tool calls', () => {
		expect(extractToolCalls({ role: 'assistant', content: 'just text' })).toEqual([]);
	});

	it('parses name, id and JSON arguments', () => {
		const message: OpenAiAssistantMessage = {
			role: 'assistant',
			content: null,
			tool_calls: [
				{
					id: 'call_1',
					type: 'function',
					function: { name: 'search_words', arguments: '{"query":"трасянка"}' },
				},
			],
		};
		expect(extractToolCalls(message)).toEqual([
			{ id: 'call_1', name: 'search_words', args: { query: 'трасянка' } },
		]);
	});

	it('tolerates malformed arguments JSON', () => {
		const message: OpenAiAssistantMessage = {
			role: 'assistant',
			content: null,
			tool_calls: [{ id: 'x', type: 'function', function: { name: 'get_site_stats', arguments: 'not json' } }],
		};
		expect(extractToolCalls(message)).toEqual([{ id: 'x', name: 'get_site_stats', args: {} }]);
	});
});

describe('extractResponseText', () => {
	it('returns the content string', () => {
		expect(extractResponseText({ role: 'assistant', content: 'answer' })).toBe('answer');
	});
});

describe('makeToolResultMessage', () => {
	it('serializes the result as JSON string content', () => {
		expect(makeToolResultMessage('call_1', { words: [] })).toEqual({
			role: 'tool',
			tool_call_id: 'call_1',
			content: '{"result":{"words":[]}}',
		});
	});
});

describe('resolveProvider', () => {
	it('defaults to groq', () => {
		const config = resolveProvider(undefined, { GROQ_API_KEY: 'gk' });
		expect(config).toEqual({
			name: 'groq',
			apiKey: 'gk',
			model: 'llama-3.3-70b-versatile',
			baseUrl: 'https://api.groq.com/openai/v1',
		});
	});

	it('switches to gemini when requested', () => {
		const config = resolveProvider('gemini', { GEMINI_API_KEY: 'gk' });
		expect(config).toEqual({
			name: 'gemini',
			apiKey: 'gk',
			model: 'gemini-3.7-flash',
			baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		});
	});

	it('honours per-provider model overrides and falls back to groq for unknown providers', () => {
		const gemini = resolveProvider('gemini', { GEMINI_API_KEY: 'gk', GEMINI_MODEL: 'gemini-3.1-flash' });
		expect(gemini.model).toBe('gemini-3.1-flash');
		const unknown = resolveProvider('claude', { GROQ_API_KEY: 'gk' });
		expect(unknown.name).toBe('groq');
	});
});
