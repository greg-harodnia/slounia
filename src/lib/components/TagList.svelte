<script lang="ts">
	let { tags }: { tags: string[] } = $props();
</script>

{#if tags.length > 0}
	<div class="tags">
		{#each tags as tag (tag)}
			<span class="chip tag-badge">{tag}</span>
		{/each}
	</div>
{/if}

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag-badge {
		font-size: 0.75rem;
		font-weight: 500;
		overflow-wrap: break-word;
		background: var(--c-tag-bg);
		color: var(--c-tag-text);
	}
</style>
