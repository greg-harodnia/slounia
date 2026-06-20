<script lang="ts">
	import { cyrToLat, latToCyr } from '$lib/lacinka';
	import { highlightText } from '$lib/highlight';
	import { fetchWord, getCachedWord } from '$lib/fetch-word';
	import { r } from '$lib/constants';
	import Tooltip from './Tooltip.svelte';
	import WordDetailContent from './WordDetailContent.svelte';
	import type { WordData } from '$lib/types';

	let {
		translation,
		comment,
		showLatin,
		showComments = true,
		searchQuery = '',
		onWordLink,
	}: {
		translation: string;
		comment: string | null;
		showLatin?: boolean;
		showComments?: boolean;
		searchQuery?: string;
		onWordLink?: (wordId: string) => void;
	} = $props();

	// cyrNorm: normalize Cyrillic before cyrToLat for search matching.
	// Without this, cyrToLat(ё) → jo/io, cyrToLat(е) → je/ie — different
	// from the visual display. Normalizing ё→е, э→е, ў→у keeps search
	// terms matching regardless of the original.
	const cyrNorm = (s: string) => s.replace(/ё/g, 'е').replace(/э/g, 'е').replace(/ў/g, 'у');
	// displayText: visual text — with correct Łacinka (ё→jo/io, ў→ŭ, etc.) + stress.
	const displayText = $derived(showLatin ? cyrToLat(translation) : translation);
	// displayQuery: the search query, also script-converted for visual highlighting.
	const displayQuery = $derived(showLatin ? cyrToLat(cyrNorm(latToCyr(searchQuery))) : latToCyr(searchQuery));
	// searchForm: same length as displayText, but with cyrNorm applied first
	// so cyrToLat produces consistent output (e vs je vs ie) that matches
	// the cyrNorm'd query. Only used as 3rd arg to highlightText (matchText).
	const searchForm = $derived(showLatin ? cyrToLat(cyrNorm(translation)) : undefined);
	const note = $derived(showComments ? comment : null);

	const crossRefTarget = $derived.by(() => {
		const m = translation.match(/^гл\.\s+(.+)$/iu);
		return m ? m[1].trim() : null;
	});

	let popupWord = $state<WordData | null>(null);
	let showPopup = $state(false);
	let popupX = $state(0);
	let popupY = $state(0);
	let popupAbove = $state(false);
	let popupMaxHeight = $state('60vh');
	let popupTimer: ReturnType<typeof setTimeout> | null = null;
	let popupToken = 0;

	function showWordPopup(e: MouseEvent) {
		if (popupTimer) clearTimeout(popupTimer);
		if (!crossRefTarget) return;
		const btn = e.currentTarget as HTMLElement;
		const token = ++popupToken;
		fetchWord(crossRefTarget);

		popupTimer = setTimeout(async () => {
			await fetchWord(crossRefTarget!);

			if (token !== popupToken) return;

			popupWord = getCachedWord(crossRefTarget!)!;

			const rect = btn.getBoundingClientRect();
			popupX = Math.max(8, Math.min(rect.left, window.innerWidth - 328));
			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			if (spaceBelow < 350 && spaceAbove >= 350) {
				popupY = rect.top - 4;
				popupAbove = true;
				popupMaxHeight = Math.max(100, spaceAbove - 12) + 'px';
			} else {
				popupY = rect.bottom + 4;
				popupAbove = false;
				popupMaxHeight = Math.max(100, spaceBelow - 12) + 'px';
			}
			showPopup = true;
		}, 150);
	}

	function hideWordPopup() {
		if (popupTimer) clearTimeout(popupTimer);
		++popupToken;
		popupTimer = setTimeout(() => {
			showPopup = false;
		}, 300);
	}

	function keepWordPopup() {
		if (popupTimer) clearTimeout(popupTimer);
	}

	function handleCrossRefClick(e: Event) {
		e.stopPropagation();
		if (popupTimer) clearTimeout(popupTimer);
		popupToken++;
		showPopup = false;
		if (crossRefTarget) onWordLink?.(crossRefTarget);
	}

	$effect(() => {
		return () => {
			if (popupTimer) clearTimeout(popupTimer);
		};
	});
</script>

{#if crossRefTarget}
	<Tooltip content={note}>
		<span class="translation-text" class:has-note={note !== null}>
			<span class="crossref-prefix">гл. </span>
			{#if onWordLink}
				<button
					onclick={handleCrossRefClick}
					onmouseenter={showWordPopup}
					onmouseleave={hideWordPopup}
					class="crossref-link">{crossRefTarget}</button
				>
			{:else}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={r('/word/' + encodeURIComponent(crossRefTarget))} class="crossref-link">{crossRefTarget}</a>
			{/if}
		</span>
	</Tooltip>
	{#if showPopup && popupWord}
		<div
			class="word-popup"
			role="tooltip"
			style="left: {popupX}px; {popupAbove
				? 'bottom: ' + (window.innerHeight - popupY) + 'px'
				: 'top: ' + popupY + 'px'}; max-height: {popupMaxHeight};"
			onmouseenter={keepWordPopup}
			onmouseleave={hideWordPopup}
		>
			<WordDetailContent word={popupWord} {onWordLink} />
		</div>
	{/if}
{:else}
	<Tooltip content={note}>
		<span class="translation-text" class:has-note={note !== null}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html highlightText(displayText, displayQuery, searchForm)}
		</span>
	</Tooltip>
{/if}

<style>
	.translation-text {
		font-size: 0.95rem;
		min-width: 0;
	}

	.crossref-prefix {
		color: var(--c-text-muted);
		font-size: 0.8rem;
	}

	.crossref-link {
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
	}

	.crossref-link:hover {
		text-decoration: underline;
	}

	.word-popup {
		position: fixed;
		z-index: 10000;
		width: 320px;
		overflow-y: auto;
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		animation: popup-in 0.15s ease;
	}

	.word-popup :global(.word-card) {
		box-shadow: none;
		padding: 1rem;
	}

	.word-popup :global(.word-title) {
		font-size: 1.2rem;
	}

	.word-popup :global(.meta-row) {
		margin-bottom: 0.75rem;
	}

	.word-popup :global(.future-note) {
		display: none;
	}

	.word-popup :global(.translation-item) {
		padding: 0.4rem 0;
	}

	@keyframes popup-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
