<script lang="ts">
	import type { Suggestion, SuggestionStatus } from '$lib/types';
	import { formatDate } from '$lib/constants';
	import { suggestStore } from '$lib/stores/suggestStore.svelte';

	let { userToken = '', devMode = false }: { userToken?: string; devMode?: boolean } = $props();

	let word = $state('');
	let translation = $state('');
	let comment = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	const statusMeta: Record<SuggestionStatus, { label: string; className: string }> = {
		pending: { label: 'У чаканьні', className: 'status-pending' },
		approved: { label: 'Ухваленае', className: 'status-approved' },
		rejected: { label: 'Адкінутае', className: 'status-rejected' },
		agreed: { label: 'Ухваленае, але без публікацыі', className: 'status-agreed' },
	};

	// userToken is set asynchronously (userStore.load() runs after this
	// component mounts on a standalone tab), so fetch whenever it changes.
	let fetchToken = $state<string | null>(null);
	$effect(() => {
		const token = userToken;
		if (fetchToken === token) return;
		fetchToken = token;
		suggestStore.fetchSuggestions(token);
	});

	async function handleSubmit() {
		submitError = '';
		if (!word.trim() || !translation.trim()) {
			submitError = 'Запоўніце абавязковыя палі';
			return;
		}
		submitting = true;
		try {
			const res = await fetch('/api/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					word: word.trim(),
					translation: translation.trim(),
					comment: comment.trim() || undefined,
					userToken: userToken || undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				submitError = data.error || 'Не ўдалося адаслаць';
				return;
			}
			word = '';
			translation = '';
			comment = '';
			suggestStore.fetchSuggestions(userToken);
		} catch (e) {
			console.error(e);
			submitError = 'Памылка сеткі';
		} finally {
			submitting = false;
		}
	}

	async function resolve(suggestion: Suggestion, status: SuggestionStatus) {
		try {
			const res = await fetch(`/api/suggestions/${suggestion.id}/resolve`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status }),
			});
			if (res.ok) {
				suggestion.status = status;
			} else {
				console.error('Resolve failed', res.status);
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function remove(suggestion: Suggestion) {
		if (!confirm(`Выдаліць прапанову «${suggestion.word}»?`)) return;
		try {
			const res = await fetch(`/api/suggestions/${suggestion.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userToken: userToken || undefined }),
			});
			if (res.ok) {
				suggestStore.removeSuggestion(suggestion.id);
			} else {
				const data = await res.json().catch(() => null);
				console.error('Delete failed', data?.error);
			}
		} catch (e) {
			console.error(e);
		}
	}
</script>

<section class="suggest">
	<details class="suggest-details">
		<summary class="suggest-summary">
			<h1 class="page-title">Запрапанаваць слова</h1>
			<svg
				class="suggest-chevron"
				viewBox="0 0 24 24"
				width="20"
				height="20"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg
			>
		</summary>
		<form class="suggest-form card" onsubmit={(e) => e.preventDefault()}>
			<label>
				Слова *
				<input type="text" bind:value={word} placeholder="Напрыклад: вопыт" />
			</label>
			<label>
				Пераклад *
				<input type="text" bind:value={translation} placeholder="Пераклады на жывую мову праз козку" />
			</label>
			<label>
				Камэнтар
				<textarea
					bind:value={comment}
					rows="3"
					placeholder="У якім значаньні/значаньнях слова ёсьць калькай? Падайце прыклады ўжытку"></textarea>
			</label>
			{#if submitError}
				<div class="error-msg">{submitError}</div>
			{/if}
			<button class="submit-btn" type="submit" onclick={handleSubmit} disabled={submitting}>
				{submitting ? 'Адсыланьне...' : 'Запрапанаваць'}
			</button>
		</form>
	</details>

	<h2 class="list-title">Запрапанаваныя словы</h2>

	{#if suggestStore.loading}
		<p class="empty">Ладаваньне...</p>
	{:else if suggestStore.error}
		<div class="empty">
			<p>Не ўдалося заладаваць прапановы.</p>
			<button class="pill" onclick={() => suggestStore.fetchSuggestions(userToken)}>Паспрабаваць ізноў</button>
		</div>
	{:else if suggestStore.suggestions.length === 0}
		<p class="empty">Пакуль няма прапаноў.</p>
	{:else}
		<div class="suggest-list">
			{#each suggestStore.suggestions as suggestion (suggestion.id)}
				<article class="suggestion card">
					<div class="suggestion-header">
						<span class="status-badge {statusMeta[suggestion.status].className}"
							>{statusMeta[suggestion.status].label}</span
						>
						<time datetime={suggestion.published_at} class="suggestion-date"
							>{formatDate(suggestion.published_at)}</time
						>
						{#if suggestion.is_mine || devMode}
							<button
								class="delete-btn"
								title="Выдаліць прапанову"
								aria-label="Выдаліць прапанову"
								onclick={() => remove(suggestion)}
							>
								<svg
									viewBox="0 0 24 24"
									width="16"
									height="16"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg
								>
							</button>
						{/if}
					</div>
					<div class="suggestion-word">{suggestion.word}</div>
					<div class="suggestion-translation">→ {suggestion.translation}</div>
					{#if suggestion.comment}
						<div class="suggestion-comment">{suggestion.comment}</div>
					{/if}
					{#if devMode}
						<div class="resolve-row">
							<button
								class="resolve-btn resolve-approved"
								onclick={() => resolve(suggestion, 'approved')}
							>
								Ухваліць
							</button>
							<button
								class="resolve-btn resolve-rejected"
								onclick={() => resolve(suggestion, 'rejected')}
							>
								Адхіліць
							</button>
							<button class="resolve-btn resolve-agreed" onclick={() => resolve(suggestion, 'agreed')}>
								Пагадзіцца
							</button>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</section>

<style>
	.suggest-details {
		flex-shrink: 0;
	}

	.suggest-summary {
		list-style: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		cursor: pointer;
	}
	.suggest-summary::-webkit-details-marker {
		display: none;
	}

	.suggest-chevron {
		flex-shrink: 0;
		color: var(--c-text-muted);
		transition: transform 0.2s;
	}
	.suggest-details[open] .suggest-chevron {
		transform: rotate(180deg);
	}

	.suggest-details[open] .suggest-summary {
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 800;
		color: var(--c-text);
		margin: 0;
		flex-shrink: 0;
	}

	.list-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--c-text);
		margin: 2rem 0 1rem;
	}

	.suggest-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
	}

	.suggest-form label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.suggest-form input,
	.suggest-form textarea {
		padding: 0.6rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--c-surface);
		color: var(--c-text);
		outline: none;
		transition: border-color 0.15s;
		text-transform: none;
		letter-spacing: normal;
	}
	.suggest-form textarea {
		resize: vertical;
		min-height: 60px;
	}
	.suggest-form input:focus,
	.suggest-form textarea:focus {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 20%, transparent);
	}

	.error-msg {
		padding: 0.6rem 1rem;
		background: var(--c-like-light);
		color: var(--c-like);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 500;
		border: 1px solid var(--c-like);
	}

	.submit-btn {
		align-self: flex-end;
		padding: 0.6rem 1.5rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.submit-btn:hover {
		opacity: 0.85;
	}
	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--c-text-muted);
		font-size: 0.95rem;
	}
	.empty button {
		margin-top: 0.75rem;
	}

	.suggest-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.suggestion {
		padding: 1rem 1.25rem;
	}

	.suggestion-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.status-badge {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		border: 1.5px solid transparent;
		min-width: 0;
	}

	.status-pending {
		color: var(--c-text-muted);
		background: var(--c-tag-bg);
		border-color: var(--c-border);
	}
	.status-approved {
		color: var(--c-importance-1);
		background: color-mix(in srgb, var(--c-importance-1) 15%, transparent);
		border-color: var(--c-importance-1);
	}
	.status-rejected {
		color: var(--c-like);
		background: var(--c-like-light);
		border-color: var(--c-like);
	}
	.status-agreed {
		color: var(--c-importance-2);
		background: color-mix(in srgb, var(--c-importance-2) 15%, transparent);
		border-color: var(--c-importance-2);
	}

	.suggestion-date {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--c-text-muted);
		white-space: nowrap;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.35rem;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.delete-btn:hover {
		color: var(--c-like);
		background: var(--c-like-light);
	}

	.suggestion-word {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--c-text);
		line-height: 1.4;
		overflow-wrap: break-word;
	}

	.suggestion-translation {
		font-size: 0.95rem;
		color: var(--c-text);
		margin-top: 0.25rem;
		overflow-wrap: break-word;
	}

	.suggestion-comment {
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--c-surface-hover);
		border-left: 3px solid var(--c-primary);
		font-size: 0.85rem;
		color: var(--c-text-muted);
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	.resolve-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.resolve-btn {
		padding: 0.35rem 0.85rem;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		font-family: inherit;
		color: #fff;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.resolve-btn:hover {
		opacity: 0.85;
	}
	.resolve-approved {
		background: var(--c-importance-1);
	}
	.resolve-rejected {
		background: var(--c-like);
	}
	.resolve-agreed {
		background: var(--c-importance-2);
	}

	@media (width <= 640px) {
		.page-title {
			font-size: 1.35rem;
		}

		.list-title {
			margin: 1.25rem 0 0.75rem;
		}

		.suggest-details[open] .suggest-summary {
			margin-bottom: 1rem;
		}

		.suggest-form {
			padding: 1rem;
		}

		.suggestion {
			padding: 0.85rem 1rem;
		}
	}
</style>
