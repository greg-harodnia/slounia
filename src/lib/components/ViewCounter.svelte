<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/stores/userStore.svelte';

	let {
		kind,
		id,
		count = 0,
		large = false,
		displayOnly = false,
	}: { kind: 'word' | 'post'; id: string; count?: number; large?: boolean; displayOnly?: boolean } = $props();

	function formatViews(n: number): string {
		if (n < 1000) return String(n);
		if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
		return Math.round(n / 1000) + 'k';
	}

	onMount(() => {
		if (!displayOnly) {
			userStore.incrementView(kind, id, count);
		}
	});
</script>

<span class="pill" class:pill--lg={large} title="Прагляды">
	<svg
		class="view-icon"
		viewBox="0 0 24 24"
		width="15"
		height="15"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
	<span class="view-count">{formatViews(userStore.getViewCount(kind, id, count))}</span>
</span>

<style>
	.pill {
		color: var(--c-text-muted);
	}

	.view-count {
		font-variant-numeric: tabular-nums;
	}

	.view-icon {
		flex-shrink: 0;
		opacity: 0.85;
	}
</style>
