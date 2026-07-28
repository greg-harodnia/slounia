<script lang="ts">
	let {
		currentPage,
		totalPages,
		onPageChange,
	}: { currentPage: number; totalPages: number; onPageChange: (page: number) => void } = $props();
</script>

{#if totalPages > 1}
	<nav class="pagination">
		<button class="page-btn" disabled={currentPage === 1} onclick={() => onPageChange(currentPage - 1)}>
			← Назад
		</button>

		{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
			<button class="page-btn" class:active={page === currentPage} onclick={() => onPageChange(page)}>
				{page}
			</button>
		{/each}

		<button class="page-btn" disabled={currentPage === totalPages} onclick={() => onPageChange(currentPage + 1)}>
			Далей →
		</button>
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.4rem;
		margin-top: 2rem;
		flex-wrap: wrap;
	}

	.page-btn {
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--c-border);
		border-radius: 6px;
		background: var(--c-bg);
		color: var(--c-text);
		cursor: pointer;
		font-size: 0.85rem;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.page-btn:hover:not(:disabled) {
		border-color: var(--c-primary);
		background: var(--c-primary-light);
	}

	.page-btn.active {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
