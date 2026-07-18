<script lang="ts">
	import { onMount } from 'svelte';
	import TranslationDisplay from '$lib/components/TranslationDisplay.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import type { WordData } from '$lib/types';
	import { parseCrossref } from '$lib/types';
	import { likes } from '$lib/stores/likes.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';
	import TagList from '$lib/components/TagList.svelte';

	let {
		word,
		onWordLink,
		popupChain,
	}: { word: WordData; onWordLink?: (wordId: string) => void; popupChain?: string[] } = $props();

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
				<span class="hidden-badge">Схаванае</span>
			{/if}
		</h1>
		<LikeButton liked={!!likes.words[word.id]} count={word.likes} onclick={onToggleWordLike} label="Like word" />
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
	<p class="future-note">Гэтае месца пакуль пустуе, таму яго заняў кот 🐈</p>
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
		font-size: 1.75rem;
		font-weight: 700;
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

	.translation-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--c-border);
	}

	.translation-item:last-child {
		border-bottom: none;
	}

	.future-note {
		margin-top: 1.5rem;
		font-size: 0.85rem;
		color: var(--c-text-muted);
		font-style: italic;
		text-align: center;
	}

	@media (max-width: 600px) {
		.word-card {
			padding: 1.25rem 1rem;
		}
		.word-title {
			font-size: 1.35rem;
		}
		.translation-item {
			gap: 0.5rem;
			padding: 0.625rem 0;
		}
		.meta-row {
			margin-bottom: 0.5rem;
		}
	}

	:global(.translation-item:first-child) {
		padding-top: 0;
	}

	:global(.translation-item:last-child) {
		padding-bottom: 0;
	}

	.hidden-badge {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: var(--c-like-light);
		color: var(--c-like);
		margin-left: 0.75rem;
		vertical-align: middle;
	}
</style>
