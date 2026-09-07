<script lang="ts">
	import WordDetailContent from './WordDetailContent.svelte';
	import type { WordData } from '$lib/types';

	let {
		allWords,
		onWordLink,
	}: {
		allWords: WordData[];
		onWordLink: (id: string, data?: WordData) => void;
	} = $props();

	let rwOpen = $state(false);
	let rwHistory = $state<WordData[]>([]);
	let rwIndex = $state(0);
	let rwTouchX = $state(0);
	let rwTouchY = $state(0);

	const rwPool = $derived(allWords.filter((w) => !w.hidden));
	const rwCurrent = $derived(rwHistory[rwIndex]);

	function rwRandom(): WordData | undefined {
		if (rwPool.length === 0) return undefined;
		return rwPool[Math.floor(Math.random() * rwPool.length)];
	}

	function rwNext() {
		if (rwIndex < rwHistory.length - 1) {
			rwIndex++;
			return;
		}
		const w = rwRandom();
		if (w) {
			rwHistory = [...rwHistory, w];
			rwIndex = rwHistory.length - 1;
		}
	}

	function rwPrev() {
		if (rwIndex > 0) rwIndex--;
	}

	function toggleRandomWord() {
		if (rwOpen) {
			rwOpen = false;
			return;
		}
		if (rwHistory.length === 0) {
			const w = rwRandom();
			if (!w) return;
			rwHistory = [w];
			rwIndex = 0;
		}
		rwOpen = true;
	}

	function rwTouchStart(e: TouchEvent) {
		const t = e.touches[0];
		if (t) {
			rwTouchX = t.clientX;
			rwTouchY = t.clientY;
		}
	}

	function rwTouchEnd(e: TouchEvent) {
		const t = e.changedTouches[0];
		if (!t) return;
		const dx = t.clientX - rwTouchX;
		const dy = t.clientY - rwTouchY;
		if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
		if (dx < 0) rwNext();
		else rwPrev();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && rwOpen) {
			rwOpen = false;
		}
	}

	function handleWordLink(id: string, data?: WordData) {
		rwOpen = false;
		onWordLink(id, data);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button class="rw-fab" aria-label="Выпадковае слова" onclick={toggleRandomWord}>
	<svg
		viewBox="0 0 24 24"
		width="26"
		height="26"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<rect x="3" y="3" width="18" height="18" rx="2.5" />
		<circle cx="8.5" cy="8.5" r="1.4" />
		<circle cx="15.5" cy="8.5" r="1.4" />
		<circle cx="12" cy="12" r="1.4" />
		<circle cx="8.5" cy="15.5" r="1.4" />
		<circle cx="15.5" cy="15.5" r="1.4" />
	</svg>
</button>
{#if rwOpen && rwCurrent}
	<button class="rw-nav rw-nav-left" aria-label="Папярэдняе слова" disabled={rwIndex === 0} onclick={rwPrev}>
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg
		>
	</button>
	<button class="rw-nav rw-nav-right" aria-label="Наступнае слова" onclick={rwNext}>
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg
		>
	</button>
	<div
		class="rw-popup"
		role="group"
		aria-label="Выпадковае слова"
		ontouchstart={rwTouchStart}
		ontouchend={rwTouchEnd}
	>
		<div class="rw-popup-head">
			<span class="rw-title">Выпадковае слова</span>
			<button class="rw-close" aria-label="Закрыць" onclick={() => (rwOpen = false)}>&times;</button>
		</div>
		<WordDetailContent word={rwCurrent} onWordLink={handleWordLink} />
	</div>
{/if}

<style>
	.rw-fab {
		position: fixed;
		left: 1rem;
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

	.rw-fab:hover {
		opacity: 0.9;
		transform: scale(1.05);
	}

	.rw-popup {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10000;
		width: 320px;
		display: flex;
		flex-direction: column;
		/* Cap the height so very tall word cards scroll instead of running off
		   the viewport. The extra vh-based term guarantees the centered popup's
		   top edge clears the mobile arrows docked at the top corners. */
		max-height: min(80vh, calc(100vh - 7.5rem));
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		animation: rw-popup-in 0.15s ease;
	}

	@keyframes rw-popup-in {
		from {
			opacity: 0;
			transform: translate(-50%, calc(-50% + 8px));
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}

	.rw-popup-head {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--c-border);
	}

	.rw-title {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--c-text-muted);
	}

	.rw-nav {
		position: fixed;
		top: 50%;
		transform: translateY(-50%);
		/* Above the popup so the arrows still show even where a near-full-width
		   popup overlaps them on small screens. */
		z-index: 10001;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: var(--c-surface);
		color: var(--c-primary);
		border: 1px solid var(--c-border);
		box-shadow: var(--shadow-md);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.rw-nav-left {
		left: max(0.75rem, calc(50% - 208px));
	}

	.rw-nav-right {
		right: max(0.75rem, calc(50% - 208px));
	}

	.rw-nav:hover:not(:disabled) {
		background: var(--c-primary);
		color: #fff;
	}

	.rw-nav:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.rw-close {
		margin-left: auto;
		background: none;
		border: none;
		font-size: 1.4rem;
		line-height: 1;
		cursor: pointer;
		color: var(--c-text-muted);
		font-family: inherit;
		padding: 0 0.25rem;
	}

	.rw-close:hover {
		color: var(--c-text);
	}

	.rw-popup :global(.word-card) {
		box-shadow: none;
		padding: 1rem;
		/* The card is the only scrollable area of the popup; the header stays
		   put. min-height: 0 lets it shrink inside the flex column, and
		   overscroll-behavior keeps the scroll from chaining to the page. */
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.rw-popup :global(.word-title) {
		font-size: 1.2rem;
	}

	.rw-popup :global(.translation-item) {
		padding: 0.5rem 0;
	}

	.rw-popup :global(.word-footer) {
		padding-top: 1rem;
	}

	@media (max-width: 480px) {
		.rw-fab {
			left: 0.75rem;
			bottom: 0.75rem;
		}

		.rw-popup {
			width: min(320px, calc(100vw - 1.5rem));
		}
	}
</style>
