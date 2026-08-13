export interface ChatMessage {
	role: 'user' | 'assistant';
	text: string;
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface OpenAiToolCall {
	id: string;
	type: 'function';
	function: { name: string; arguments: string };
}

export interface OpenAiAssistantMessage {
	role: 'assistant';
	content: string | null;
	tool_calls?: OpenAiToolCall[];
}

export interface OpenAiUserMessage {
	role: 'user';
	content: string;
}

export interface OpenAiToolMessage {
	role: 'tool';
	tool_call_id: string;
	content: string;
}

export type OpenAiMessage = OpenAiUserMessage | OpenAiAssistantMessage | OpenAiToolMessage;

export const MAX_MESSAGES = 40;
export const MAX_TEXT_CHARS = 4000;

// Cap how much conversation history is sent to the model (last N messages,
// each text truncated) to protect the free-tier context window.
export function limitMessages(messages: ChatMessage[]): ChatMessage[] {
	const sliced = messages.slice(-MAX_MESSAGES);
	return sliced.map((m) => (m.text.length > MAX_TEXT_CHARS ? { ...m, text: m.text.slice(0, MAX_TEXT_CHARS) } : m));
}

// Convert the UI message format to OpenAI-compatible chat messages.
export function toOpenAiMessages(messages: ChatMessage[]): OpenAiUserMessage[] {
	return limitMessages(messages).map((m) => ({ role: 'user', content: m.text }));
}

// Pull all tool calls out of an assistant message (Groq/OpenAI format).
export function extractToolCalls(message: OpenAiAssistantMessage): ToolCall[] {
	const calls: ToolCall[] = [];
	for (const tc of message.tool_calls ?? []) {
		let args: Record<string, unknown> = {};
		try {
			args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
		} catch {
			// malformed arguments JSON, keep empty object
		}
		calls.push({ id: tc.id, name: tc.function.name, args });
	}
	return calls;
}

// Get the text content of an assistant message.
export function extractResponseText(message: OpenAiAssistantMessage): string {
	return message.content ?? '';
}

// Build the tool-result message to feed back after executing a tool call.
export function makeToolResultMessage(callId: string, result: unknown): OpenAiToolMessage {
	return { role: 'tool', tool_call_id: callId, content: JSON.stringify({ result }) };
}
