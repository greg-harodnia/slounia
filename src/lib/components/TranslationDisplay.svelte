<script lang="ts">
	import { cyrToLat, latToCyr } from '$lib/lacinka';
	import { highlightText } from '$lib/highlight';
	import { fetchWord, getCachedWord } from '$lib/fetch-word';
	import { r } from '$lib/constants';
	import Tooltip from './Tooltip.svelte';
	import WordDetailContent from './WordDetailContent.svelte';
	import type { WordData } from '$lib/types';
	import { parseCrossref } from '$lib/types';
	import { computePopupPosition } from '$lib/popup-position';

	let {
		translation,
		comment,
		showLatin,
		showComments = true,
		searchQuery = '',
		onWordLink,
		popupChain,
	}: {
		translation: string;
		comment: string | null;
		showLatin?: boolean;
		showComments?: boolean;
		searchQuery?: string;
		onWordLink?: (wordId: string) => void;
		popupChain?: string[];
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

	const crossRef = $derived.by(() => {
		const m = parseCrossref(translation);
		return m ? { prefix: m[1].toLowerCase() + '. ', target: m[2].trim() } : null;
	});

	let popupWord = $state<WordData | null>(null);
	let showPopup = $state(false);
	let popupX = $state(0);
	let popupY = $state(0);
	let popupAbove = $state(false);
	let popupMaxHeight = $state('60vh');
	let popupTimer: ReturnType<typeof setTimeout> | null = null;
	let popupToken = 0;
	let loadingFetch = $state(false);
	let showMeme = $state(false);

	function showWordPopup(e: MouseEvent) {
		if (popupTimer) clearTimeout(popupTimer);
		if (!crossRef) return;

		if (popupChain?.includes(crossRef.target)) {
			const btn = e.currentTarget as HTMLElement;
			const rect = btn.getBoundingClientRect();
			popupX = Math.max(8, Math.min(rect.left, window.innerWidth - 328));
			const pos = computePopupPosition(rect, { gap: 4, minHeight: 350 });
			popupY = pos.top;
			popupAbove = pos.above;
			popupMaxHeight = pos.maxHeight + 'px';
			popupToken++;
			showMeme = true;
			showPopup = true;
			return;
		}

		const btn = e.currentTarget as HTMLElement;
		const token = ++popupToken;
		if (!getCachedWord(crossRef.target)) loadingFetch = true;
		fetchWord(crossRef.target);

		popupTimer = setTimeout(async () => {
			await fetchWord(crossRef.target);

			if (token !== popupToken) {
				loadingFetch = false;
				return;
			}

			loadingFetch = false;
			popupWord = getCachedWord(crossRef.target)!;

			const rect = btn.getBoundingClientRect();
			popupX = Math.max(8, Math.min(rect.left, window.innerWidth - 328));
			const pos = computePopupPosition(rect, { gap: 4, minHeight: 350 });
			popupY = pos.top;
			popupAbove = pos.above;
			popupMaxHeight = pos.maxHeight + 'px';
			showPopup = true;
		}, 150);
	}

	function hideWordPopup() {
		if (popupTimer) clearTimeout(popupTimer);
		++popupToken;
		loadingFetch = false;
		popupTimer = setTimeout(() => {
			showPopup = false;
			showMeme = false;
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
		if (crossRef) onWordLink?.(crossRef.target);
	}

	$effect(() => {
		return () => {
			if (popupTimer) clearTimeout(popupTimer);
		};
	});
</script>

{#if crossRef}
	<Tooltip content={note}>
		<span class="translation-text" class:has-note={note !== null}>
			<span class="crossref-prefix">{crossRef.prefix}</span>
			{#if onWordLink}
				<button
					onclick={handleCrossRefClick}
					onmouseenter={showWordPopup}
					onmouseleave={hideWordPopup}
					class="crossref-link"
					class:loading={loadingFetch}>{crossRef.target}</button
				>
			{:else}
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={r('/word/' + encodeURIComponent(crossRef.target))}
					class="crossref-link"
					class:loading={loadingFetch}>{crossRef.target}</a
				>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</span>
	</Tooltip>
	{#if showPopup && (showMeme || popupWord)}
		<div
			class="word-popup"
			role="tooltip"
			style="left: {popupX}px; {popupAbove
				? 'bottom: ' + (window.innerHeight - popupY) + 'px'
				: 'top: ' + popupY + 'px'}; max-height: {popupMaxHeight};"
			onmouseenter={keepWordPopup}
			onmouseleave={hideWordPopup}
		>
			{#if showMeme}
				<img src="/spiderman.webp" alt="Spider-Man pointing at Spider-Man" class="spiderman-meme" />
			{:else}
				<WordDetailContent word={popupWord!} {onWordLink} {popupChain} />
			{/if}
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
		font-style: italic !important;
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

	.crossref-link.loading {
		cursor: wait;
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

	.word-popup :global(.future-note) {
		display: none;
	}

	.word-popup :global(.translation-item) {
		padding: 0.5rem 0;
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

	.spiderman-meme {
		width: 100%;
		border-radius: 8px;
		display: block;
	}
</style>
