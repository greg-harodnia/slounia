<script lang="ts">
	let { name, level }: { name: string | null; level: number | null } = $props();
</script>

{#if name}
	<span class="chip importance-badge" data-level={level ?? 1}>
		{name}
	</span>
{/if}

<style>
	.importance-badge {
		background: color-mix(in srgb, var(--c-importance-4) 15%, transparent);
		color: var(--c-importance-4);
	}

	.importance-badge[data-level='1'] {
		background: color-mix(in srgb, var(--c-importance-1) 15%, transparent);
		color: var(--c-importance-1);
	}

	.importance-badge[data-level='2'] {
		background: color-mix(in srgb, var(--c-importance-2) 15%, transparent);
		color: var(--c-importance-2);
	}

	.importance-badge[data-level='3'] {
		background: color-mix(in srgb, var(--c-importance-3) 15%, transparent);
		color: var(--c-importance-3);
	}

	.importance-badge[data-level='4'] {
		background: color-mix(in srgb, var(--c-importance-4) 15%, transparent);
		color: var(--c-importance-4);
	}

	.importance-badge[data-level='5'] {
		background: color-mix(in srgb, var(--c-importance-5) 15%, transparent);
		color: var(--c-importance-5);
	}
</style>
