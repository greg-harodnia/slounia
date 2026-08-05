<script lang="ts">
	import { onMount } from 'svelte';
	import TranslationDisplay from '$lib/components/TranslationDisplay.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { WordData } from '$lib/types';
	import { parseCrossref } from '$lib/types';
	import { likes } from '$lib/stores/likes.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import ViewCounter from '$lib/components/ViewCounter.svelte';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';
	import TagList from '$lib/components/TagList.svelte';

	let {
		word,
		onWordLink,
		popupChain,
		enableViews = false,
	}: {
		word: WordData;
		onWordLink?: (wordId: string) => void;
		popupChain?: string[];
		enableViews?: boolean;
	} = $props();

	onMount(() => likes.load());

	function onToggleWordLike() {
		likes.toggleWord(word.id, word);
	}

	function onToggleTranslationLike(trId: number, tr: { likes: number }) {
		likes.toggleTranslation(trId, tr);
	}
</script>

<div class="word-card card">
	<div class="word-header">
		<h1 class="word-title">
			<Tooltip content={word.comment}>
				<span class:has-note={word.comment !== null}>{word.id}</span>
			</Tooltip>
			{#if word.hidden}
				<span class="badge hidden-badge">Схаванае</span>
			{/if}
		</h1>
	</div>

	<div class="meta-row">
		<ImportanceBadge name={word.importance.name} level={word.importance.level} />
		<TagList tags={word.tags} />
	</div>

	<div class="translations-scroll">
		<div class="translations">
			{#each word.translations as tr (tr.id)}
				<div class="translation-item">
					<TranslationDisplay
						translation={tr.translation}
						comment={tr.comment}
						showLatin={settings.showLatin}
						{onWordLink}
						popupChain={[...(popupChain ?? []), word.id]}
					/>
					{#if !parseCrossref(tr.translation)}
						<LikeButton
							liked={!!likes.translations[tr.id]}
							count={tr.likes}
							onclick={() => onToggleTranslationLike(tr.id, tr)}
							label="Like translation"
							small
						/>
					{/if}
				</div>
			{/each}
			{#if word.translations.length === 0}
				<p class="muted">Не перакладзена</p>
			{/if}
		</div>
	</div>

	<footer class="word-footer">
		{#if enableViews}
			<ViewCounter kind="word" id={word.id} count={word.views} />
		{/if}
		<span class="word-like">
			<LikeButton
				liked={!!likes.words[word.id]}
				count={word.likes}
				onclick={onToggleWordLike}
				label="Like word"
			/>
		</span>
	</footer>
</div>

<style>
	.word-card {
		min-height: 0;
		max-height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 2rem;
		box-shadow: var(--shadow);
	}

	.word-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.word-title {
		line-height: 1;
		font-size: 1.75rem;
		font-weight: 700;
		padding-bottom: 1rem;
		margin: 0;
		flex: 1;
	}

	.meta-row {
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	:global(.word-popup .meta-row) {
		margin-bottom: 0rem;
	}

	.translations-scroll {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.translations {
		padding-top: 0.5rem;
	}

	.word-footer {
		padding-top: 1.5rem;
		flex-shrink: 0;
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
	}

	.word-like {
		display: flex;
		margin-left: auto;
	}

	.translation-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--c-border);
	}

	.translation-item :global(.tooltip-box) {
		overflow: hidden;
	}

	@media (max-width: 600px) {
		.word-card {
			padding: 1.25rem 1rem;
		}
		.word-title {
			font-size: 1.35rem;
			padding-bottom: 0.5rem;
		}
		.translation-item {
			gap: 0.5rem;
			padding: 0.625rem 0;
		}
		.meta-row {
			margin-bottom: 0.5rem;
		}

		.word-footer {
			padding-top: 1rem;
		}
	}

	:global(.translation-item:first-child) {
		padding-top: 0;
	}

	.hidden-badge {
		margin-left: 0.75rem;
		vertical-align: middle;
	}
</style>
