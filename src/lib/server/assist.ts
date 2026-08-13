import { env } from '$env/dynamic/private';
import { getServiceClient } from '$lib/server/db';
import { HIDDEN_CONTEXT, SYSTEM_PROMPT } from './assist-context';
import {
	extractResponseText,
	extractToolCalls,
	limitMessages,
	makeToolResultMessage,
	resolveProvider,
	toOpenAiMessages,
	type ChatMessage,
	type OpenAiAssistantMessage,
} from './assist-core';

const MAX_TOOL_ROUNDS = 5;
const MAX_POST_SNIPPET = 600; // chars of blog content sent to the model

// Keep hidden (draft) words private unless the project explicitly opts in.
const INCLUDE_HIDDEN_WORDS = false;

type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

// Function declarations the model may call. All tools are read-only.
const TOOLS: Record<string, { description: string; parameters: object; run: ToolExecutor }> = {
	search_words: {
		description:
			'Search the dictionary for words matching a query. Returns words with their importance, translations, comments, likes and tags. Use this for any question about a word, phrase or translation.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'The word or phrase to search for, e.g. "трасянка"' },
			},
			required: ['query'],
		},
		run: async ({ query }) => {
			const supabase = getServiceClient();
			const { data, error } = await supabase.rpc('get_words', {
				search: String(query ?? ''),
				tag_filter: '',
				sort_field: 'relevance',
				sort_dir: 'desc',
				result_offset: 0,
				result_limit: 10,
				word_ids: null,
				include_hidden: INCLUDE_HIDDEN_WORDS,
			});
			if (error) return { error: error.message };
			return data as { words: unknown[]; total: number };
		},
	},
	get_word: {
		description:
			'Get the full entry for one exact word by its id (e.g. "трасянка"). Use this after search_words when the user wants details of a specific word.',
		parameters: {
			type: 'object',
			properties: {
				word_id: { type: 'string', description: 'The exact word id, e.g. "трасянка"' },
			},
			required: ['word_id'],
		},
		run: async ({ word_id }) => {
			const supabase = getServiceClient();
			const { data, error } = await supabase.rpc('get_word_by_id', { word_id: String(word_id ?? '') });
			if (error) return { error: error.message };
			if (!data) return { not_found: true };
			return data;
		},
	},
	search_posts: {
		description:
			'Search the site blog posts by title or content. Returns a list of posts with slug, title, hashtags, date, likes, views and a short excerpt.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'The text to search for in post titles or content' },
			},
			required: ['query'],
		},
		run: async ({ query }) => {
			const supabase = getServiceClient();
			const q = String(query ?? '').trim();
			let request = supabase.from('posts').select('slug,title,hashtags,published_at,likes,views,content');
			if (q) {
				const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
				request = request.or(`title.ilike.${like},content.ilike.${like}`);
			}
			const { data, error } = await request.order('published_at', { ascending: false }).limit(6);
			if (error) return { error: error.message };
			return (data ?? []).map((p) => ({ ...p, content: (p.content ?? '').slice(0, MAX_POST_SNIPPET) }));
		},
	},
	get_post: {
		description: 'Get the full content of a blog post by its slug.',
		parameters: {
			type: 'object',
			properties: { slug: { type: 'string', description: 'The post slug, e.g. "hello-world"' } },
			required: ['slug'],
		},
		run: async ({ slug }) => {
			const supabase = getServiceClient();
			const { data, error } = await supabase
				.from('posts')
				.select('*')
				.eq('slug', String(slug ?? ''))
				.maybeSingle();
			if (error) return { error: error.message };
			if (!data) return { not_found: true };
			return data;
		},
	},
	get_site_stats: {
		description: 'Get overall site statistics: number of public words, translations, blog posts and tags.',
		parameters: { type: 'object', properties: {} },
		run: async () => {
			const supabase = getServiceClient();
			const [words, translations, posts, tags] = await Promise.all([
				supabase.from('words').select('id', { count: 'exact', head: true }).eq('hidden', false),
				supabase.from('translations').select('id', { count: 'exact', head: true }),
				supabase.from('posts').select('id', { count: 'exact', head: true }),
				supabase.from('tags').select('id', { count: 'exact', head: true }),
			]);
			return {
				words: words.count ?? 0,
				translations: translations.count ?? 0,
				posts: posts.count ?? 0,
				tags: tags.count ?? 0,
			};
		},
	},
};

// Groq uses the OpenAI tools format: { type: 'function', function: {...} }.
const TOOL_DECLARATIONS = Object.entries(TOOLS).map(([name, tool]) => ({
	type: 'function' as const,
	function: { name, description: tool.description, parameters: tool.parameters },
}));

function extractErrorMessage(error: unknown): string {
	if (error && typeof error === 'object' && 'message' in error)
		return String((error as { message: unknown }).message);
	return String(error);
}

async function chatCompletion(
	providerName: string,
	baseUrl: string,
	apiKey: string,
	model: string,
	messages: unknown[],
): Promise<{ choices?: { message?: OpenAiAssistantMessage }[] }> {
	const res = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${HIDDEN_CONTEXT}` }, ...messages],
			tools: TOOL_DECLARATIONS,
			temperature: 0.3,
			max_tokens: 1500,
		}),
	});

	if (!res.ok) {
		let detail = '';
		try {
			const body = (await res.json()) as { error?: { message?: string } };
			detail = body.error?.message ?? '';
		} catch {
			// non-JSON error body
		}
		throw new Error(`${providerName} request failed (${res.status}): ${detail}`);
	}
	return res.json();
}

export async function runAssist(messages: ChatMessage[]): Promise<string> {
	const provider = resolveProvider(env.ASSIST_PROVIDER, env);
	if (!provider.apiKey) {
		throw new Error(`No AI API key set for provider "${provider.name}"`);
	}

	// history is mutated across tool-calling rounds (assistant turn + tool results).
	const history: unknown[] = [...toOpenAiMessages(limitMessages(messages))];

	for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
		const response = await chatCompletion(
			provider.name,
			provider.baseUrl,
			provider.apiKey,
			provider.model,
			history,
		);
		const message = response.choices?.[0]?.message;
		if (!message) {
			throw new Error(`${provider.name} returned an empty response`);
		}

		const calls = extractToolCalls(message);
		if (calls.length === 0) {
			return extractResponseText(message) || '…';
		}

		history.push(message);
		for (const call of calls) {
			let result: unknown;
			try {
				result = TOOLS[call.name]
					? await TOOLS[call.name].run(call.args)
					: { error: `Unknown tool: ${call.name}` };
			} catch (error) {
				result = { error: extractErrorMessage(error) };
			}
			history.push(makeToolResultMessage(call.id, result));
		}
	}

	throw new Error(`Exceeded the tool-call limit (${provider.name})`);
}
