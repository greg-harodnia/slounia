<script lang="ts">
	let { tags }: { tags: string[] } = $props();
</script>

{#if tags.length > 0}
	<div class="tags">
		{#each tags as tag (tag)}
			<span class="tag">{tag}</span>
		{/each}
	</div>
{/if}

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
