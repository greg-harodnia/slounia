<script lang="ts">
	import { onMount } from 'svelte';

	let {
		kind,
		id,
		count = 0,
		large = false,
	}: { kind: 'word' | 'post'; id: string; count?: number; large?: boolean } = $props();

	/* svelte-ignore state_referenced_locally */
	const key = `viewed_${kind}_${id}`;

	function readStored(): number | null {
		try {
			const v = sessionStorage.getItem(key);
			if (v == null) return null;
			const n = parseInt(v, 10);
			return Number.isFinite(n) ? n : null;
		} catch {
			return null;
		}
	}

	/* svelte-ignore state_referenced_locally */
	let current = $state(Math.max(count ?? 0, readStored() ?? 0));

	function formatViews(n: number): string {
		if (n < 1000) return String(n);
		if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
		return Math.round(n / 1000) + 'k';
	}

	onMount(() => {
		if (readStored() != null) return;

		fetch('/api/views', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind, id }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.views != null) {
					current = data.views;
					try {
						sessionStorage.setItem(key, String(data.views));
					} catch {
						// sessionStorage unavailable
					}
				}
			})
			.catch(() => {});
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
	<span class="view-count">{formatViews(current)}</span>
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
