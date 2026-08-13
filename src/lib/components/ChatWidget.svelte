<script lang="ts">
	import { browser } from '$app/environment';
	import { renderMarkdown } from '$lib/assist-markdown';

	interface ChatMsg {
		role: 'user' | 'assistant';
		text: string;
	}

	const STORAGE_KEY = 'slounia_assist_history';
	const GREETING: ChatMsg = {
		role: 'assistant',
		text: 'Вітаю! Я бязглузды й недарэчны AI-памочнік. Чым магу дапамагчы?',
	};

	const svgChat =
		'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
	const svgExpand =
		'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
	const svgShrink =
		'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
	const svgSend =
		'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

	// `startOpen` is only used to decide the initial state (the widget mounts
	// open when opened from the static FAB); afterwards `open` is fully internal.
	let { open: startOpen = false } = $props();
	const openFromProps = () => startOpen;
	let open = $state.raw(openFromProps());
	let expanded = $state(false);
	let messages = $state<ChatMsg[]>([]);
	let input = $state('');
	let loading = $state(false);
	let error = $state('');
	let listEl: HTMLDivElement | undefined = $state();

	function loadHistory(): ChatMsg[] {
		if (!browser) return [GREETING];
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed: unknown = JSON.parse(raw);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChatMsg[];
			}
		} catch {
			// corrupted history, fall through to greeting
		}
		return [GREETING];
	}

	messages = loadHistory();

	$effect(() => {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
		} catch {
			// storage unavailable (e.g. private mode)
		}
	});

	$effect(() => {
		const el = listEl;
		if (!el) return;
		// Re-run whenever the messages or typing indicator change; rAF guarantees
		// layout is done before scrolling.
		void messages;
		void loading;
		requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight;
		});
	});

	async function send() {
		const text = input.trim();
		if (!text || loading) return;
		messages = [...messages, { role: 'user', text }];
		input = '';
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/assist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, text: m.text })) }),
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Памылка';
			} else {
				messages = [...messages, { role: 'assistant', text: data.reply }];
			}
		} catch {
			error = 'Памылка сеткі. Паспрабуйце пазьней.';
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (expanded ? (expanded = false) : (open = false))} />

{#if open}
	<div class="chat" class:expanded>
		<header class="chat-header">
			<span class="chat-title">Дапамога Слоўні</span>
			<div class="chat-actions">
				<button
					class="icon-btn"
					aria-label={expanded ? 'Згарнуць у акно' : 'Разгарнуць на ўвесь экран'}
					onclick={() => (expanded = !expanded)}
				>
					{@html expanded ? svgShrink : svgExpand}
				</button>
				<button class="icon-btn close-btn" aria-label="Зачыніць дапамогу" onclick={() => (open = false)}>
					&times;
				</button>
			</div>
		</header>

		<div class="chat-msgs" bind:this={listEl}>
			{#each messages as m, i (i)}
				{#if m.role === 'assistant'}
					<div class="bubble assistant">{@html renderMarkdown(m.text)}</div>
				{:else}
					<div class="bubble user">{m.text}</div>
				{/if}
			{/each}
			{#if loading}
				<div class="bubble assistant typing" aria-label="Помнік думае">
					<span class="dot"></span><span class="dot"></span><span class="dot"></span>
				</div>
			{/if}
		</div>

		<div class="chat-footer">
			{#if error}
				<div class="chat-error">{error}</div>
			{/if}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<textarea bind:value={input} onkeydown={onKeydown} placeholder="Напішыце пытаньне…" rows="1"></textarea>
				<button class="send-btn" type="submit" disabled={loading || !input.trim()} aria-label="Адаслаць">
					{@html svgSend}
				</button>
			</form>
		</div>
	</div>
{:else}
	<button class="fab" aria-label="Адкрыць памочніка" onclick={() => (open = true)}>{@html svgChat}</button>
{/if}

<style>
	.chat {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 95;
		width: min(380px, calc(100vw - 2rem));
		height: min(560px, calc(100dvh - 5rem));
		display: flex;
		flex-direction: column;
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--radius);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
		overflow: hidden;
		animation: chat-in 0.18s ease;
	}

	.chat.expanded {
		inset: 0;
		width: auto;
		height: auto;
		border: none;
		border-radius: 0;
		z-index: 300;
		animation: none;
	}

	@keyframes chat-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-primary);
		color: #fff;
		flex-shrink: 0;
	}

	.chat-title {
		font-weight: 700;
		font-size: 0.95rem;
	}

	.chat-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.icon-btn {
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		opacity: 0.85;
		transition: opacity 0.15s;
	}

	.icon-btn:hover {
		opacity: 1;
	}

	.close-btn {
		font-size: 1.4rem;
		line-height: 1;
	}

	.chat-msgs {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		scrollbar-width: none;
	}

	.chat-msgs::-webkit-scrollbar {
		display: none;
	}

	.bubble {
		max-width: 85%;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	.bubble.user {
		align-self: flex-end;
		background: var(--c-primary);
		color: #fff;
		border-bottom-right-radius: 2px;
	}

	.bubble.assistant {
		align-self: flex-start;
		background: var(--c-surface-hover);
		border: 1px solid var(--c-border);
		border-bottom-left-radius: 2px;
		white-space: normal;
	}

	.bubble.assistant :global(p) {
		margin: 0 0 0.4rem;
	}

	.bubble.assistant :global(p:last-child) {
		margin-bottom: 0;
	}

	.bubble.assistant :global(ul),
	.bubble.assistant :global(ol) {
		margin: 0.25rem 0 0.4rem;
		padding-left: 1.2rem;
	}

	.bubble.assistant :global(ul:last-child),
	.bubble.assistant :global(ol:last-child) {
		margin-bottom: 0;
	}

	.bubble.assistant :global(li) {
		margin: 0.15rem 0;
	}

	.bubble.assistant :global(strong) {
		font-weight: 700;
	}

	.bubble.assistant :global(a) {
		color: var(--c-primary);
		text-decoration: underline;
	}

	.bubble.assistant :global(code) {
		background: var(--c-border);
		border-radius: 3px;
		padding: 0.1rem 0.3rem;
		font-size: 0.85em;
	}

	.bubble.assistant :global(pre) {
		background: var(--c-border);
		border-radius: var(--radius-sm);
		padding: 0.5rem;
		overflow-x: auto;
		margin: 0.25rem 0 0.4rem;
	}

	.bubble.assistant :global(pre:last-child) {
		margin-bottom: 0;
	}

	.bubble.assistant :global(pre code) {
		background: none;
		padding: 0;
	}

	.bubble.typing {
		display: flex;
		gap: 4px;
		align-items: center;
		padding: 0.6rem 0.75rem;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--c-text-muted);
		animation: blink 1.2s infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes blink {
		0%,
		80%,
		100% {
			opacity: 0.25;
		}
		40% {
			opacity: 1;
		}
	}

	.chat-footer {
		border-top: 1px solid var(--c-border);
		padding: 0.75rem 1rem;
		flex-shrink: 0;
	}

	.chat-error {
		color: var(--c-like);
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
	}

	form {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}

	textarea {
		flex: 1;
		resize: none;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--c-surface);
		color: var(--c-text);
		outline: none;
		transition: border-color 0.15s;
		max-height: 120px;
	}

	textarea:focus {
		border-color: var(--c-primary);
	}

	.send-btn {
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.send-btn:hover {
		opacity: 0.85;
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.fab {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 95;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--c-primary);
		color: #fff;
		border: none;
		cursor: pointer;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
		transition:
			transform 0.15s,
			opacity 0.15s;
	}

	.fab:hover {
		opacity: 0.9;
		transform: scale(1.05);
	}

	@media (max-width: 480px) {
		.chat:not(.expanded) {
			right: 0.5rem;
			left: 0.5rem;
			bottom: 0.5rem;
			width: auto;
			height: calc(100dvh - 5rem);
		}

		.fab {
			right: 0.75rem;
			bottom: 0.75rem;
		}
	}
</style>
