<script lang="ts">
	let {
		currentPage,
		totalPages,
		onPageChange,
	}: { currentPage: number; totalPages: number; onPageChange: (page: number) => void } = $props();

	const pageItems = $derived.by(() => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, i) => i + 1) as (number | 'ellipsis')[];
		}
		const items: (number | 'ellipsis')[] = [1];
		const start = Math.max(2, currentPage - 1);
		const end = Math.min(totalPages - 1, currentPage + 1);
		if (start > 2) items.push('ellipsis');
		for (let i = start; i <= end; i++) items.push(i);
		if (end < totalPages - 1) items.push('ellipsis');
		items.push(totalPages);
		return items;
	});

	// Narrow screens only fit a handful of buttons on one line, so show up to
	// three pages near the start/end (or the current page in the middle) plus
	// the last page, e.g. "1 2 3 … 10".
	const mobilePageItems = $derived.by((): (number | 'ellipsis')[] => {
		if (totalPages <= 4) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}
		if (currentPage <= 3) {
			return [1, 2, 3, 'ellipsis', totalPages];
		}
		if (currentPage >= totalPages - 2) {
			return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
		}
		return [1, 'ellipsis', currentPage, 'ellipsis', totalPages];
	});
</script>

{#snippet pageButtons(items: (number | 'ellipsis')[])}
	{#each items as item, i (i)}
		{#if item === 'ellipsis'}
			<span class="ellipsis">…</span>
		{:else}
			<button class="page-btn" class:active={item === currentPage} onclick={() => onPageChange(item)}>
				{item}
			</button>
		{/if}
	{/each}
{/snippet}

{#if totalPages > 1}
	<nav class="pagination">
		<button class="page-btn" disabled={currentPage === 1} onclick={() => onPageChange(currentPage - 1)}>
			← Назад
		</button>

		<div class="pages pages--desktop">{@render pageButtons(pageItems)}</div>
		<div class="pages pages--mobile">{@render pageButtons(mobilePageItems)}</div>

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
		margin-top: 0.5rem;
		padding-bottom: env(safe-area-inset-bottom, 0px);
		flex-wrap: wrap;
	}

	.pages {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.pages--mobile {
		display: none;
	}

	.ellipsis {
		color: var(--c-text-muted);
		padding: 0.4rem 0.25rem;
		line-height: 1;
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

	@media (max-width: 600px) {
		.pagination {
			flex-wrap: nowrap;
			gap: 0.3rem;
		}

		.pages {
			gap: 0.3rem;
		}

		.pages--desktop {
			display: none;
		}

		.pages--mobile {
			display: flex;
		}

		.page-btn {
			padding: 0.35rem 0.5rem;
			font-size: 0.8rem;
		}
	}
</style>
