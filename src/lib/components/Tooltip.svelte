<script lang="ts" module>
	let pinnedId: symbol | null = null;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		content,
		children,
		maxWidth = 500,
	}: {
		content: string | null;
		children: Snippet;
		maxWidth?: number;
	} = $props();

	const id = Symbol();
	let visible = $state(false);
	let pinned = $state(false);
	let x = $state(0);
	let y = $state(0);

	function isTouchDevice() {
		return window.matchMedia('(pointer: coarse)').matches;
	}

	function show(e: MouseEvent) {
		if (!content) return;
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		x = rect.left;
		y = rect.bottom;
		visible = true;
	}

	function onLeave() {
		if (!pinned) visible = false;
	}

	function togglePin(e: MouseEvent) {
		if (!content || isTouchDevice()) return;
		e.stopPropagation();
		if (pinned) {
			pinned = false;
			pinnedId = null;
			visible = false;
		} else {
			if (pinnedId) window.dispatchEvent(new CustomEvent('tooltip-unpin', { detail: pinnedId }));
			show(e);
			pinned = true;
			pinnedId = id;
		}
	}

	function linkify(text: string): string {
		return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
	}

	$effect(() => {
		function onUnpin(event: Event) {
			if ((event as CustomEvent).detail === id) {
				pinned = false;
				visible = false;
				pinnedId = null;
			}
		}
		window.addEventListener('tooltip-unpin', onUnpin);

		if (pinned) {
			const handler = () => {
				pinned = false;
				pinnedId = null;
				visible = false;
			};
			window.addEventListener('click', handler);
			return () => {
				window.removeEventListener('click', handler);
				window.removeEventListener('tooltip-unpin', onUnpin);
			};
		}

		return () => window.removeEventListener('tooltip-unpin', onUnpin);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<span onmouseenter={show} onmouseleave={onLeave} onclick={togglePin}>
	{@render children()}
</span>

{#if visible && content}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<div
		class="tooltip"
		role="tooltip"
		onclick={(e) => e.stopPropagation()}
		style="left: {x + 6 + 300 > window.innerWidth ? Math.max(6, x - 306) : x + 6}px; top: {y + 6 + 50 >
		window.innerHeight
			? Math.max(6, y - 56)
			: y + 6}px; max-width: {maxWidth}px;"
	>
		{#each content.split('\n') as line, i (i)}
			{#if i > 0}<br />{/if}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html linkify(line)}
		{/each}
	</div>
{/if}

<style>
	.tooltip {
		position: fixed;
		z-index: 9999;
		background: var(--c-tooltip-bg, var(--c-text));
		color: var(--c-tooltip-text, var(--c-bg));
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		font-size: 0.78rem;
		font-weight: 400;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		word-wrap: break-word;
		white-space: normal;
		line-height: 1.4;
		user-select: text;
		-webkit-user-select: text;
	}

	.tooltip :global(a) {
		color: var(--c-primary);
		text-decoration: underline;
	}

	.tooltip :global(a:visited) {
		color: var(--c-primary);
	}

	.tooltip :global(a:hover) {
		opacity: 0.85;
	}

	@media (pointer: coarse) {
		.tooltip {
			max-height: 40vh;
			overflow-y: auto;
		}
	}
</style>
