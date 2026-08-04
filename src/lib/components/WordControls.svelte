<script lang="ts">
	import type { TagData } from '$lib/types';

	interface Props {
		tags: TagData[];
		selectedTags: string[];
		total: number;
		sort: string;
		order: string;
		search?: string;
		searchInput?: HTMLInputElement;
		onSearchInput: () => void;
		onSearchEnter: () => void;
		onSearchEscape: () => void;
		onClearSearch: () => void;
		onTagFilter: (tagName: string) => void;
		onSort: (field: string) => void;
	}

	let {
		tags,
		selectedTags,
		total,
		sort,
		order,
		search = $bindable(),
		searchInput = $bindable(),
		onSearchInput,
		onSearchEnter,
		onSearchEscape,
		onClearSearch,
		onTagFilter,
		onSort,
	}: Props = $props();

	function getSortIcon(field: string) {
		if (sort !== field) return '↕';
		return order === 'asc' ? '↑' : '↓';
	}
</script>

<div class="controls">
	<div class="search-box">
		<div class="search-input-wrap">
			<div class="search-input-inner">
				<input
					type="text"
					placeholder="Пошук у словах (г=ґ, у=ў, и=і, е=ё)"
					bind:this={searchInput}
					bind:value={search}
					oninput={onSearchInput}
					onkeydown={(e) => {
						if (e.key === 'Enter') onSearchEnter();
						else if (e.key === 'Escape') onSearchEscape();
					}}
				/>
				{#if search}
					<button class="search-clear" onclick={onClearSearch} aria-label="Clear search">×</button>
				{/if}
			</div>
			<span class="word-counter">{total}</span>
		</div>
	</div>

	<div class="tags-row" role="group" aria-label="Фільтр водле тэґаў">
		{#each tags as tag (tag.name)}
			<button
				class="tag-chip pill tag-pill"
				class:active={selectedTags.includes(tag.name)}
				onclick={() => onTagFilter(tag.name)}
				aria-pressed={selectedTags.includes(tag.name)}
			>
				{tag.name}
			</button>
		{/each}
	</div>

	<div class="grid-header">
		<div class="col-word">
			<button class="sort-btn" class:active={sort === 'word'} onclick={() => onSort('word')}>
				Слова {getSortIcon('word')}
			</button>
			<button class="sort-btn" class:active={sort === 'importance'} onclick={() => onSort('importance')}>
				⚑ {getSortIcon('importance')}
			</button>
		</div>
		<div class="col-trans">Пераклад</div>
		<div class="col-likes">
			<button class="sort-btn" class:active={sort === 'likes'} onclick={() => onSort('likes')}>
				❤️ {getSortIcon('likes')}
			</button>
		</div>
	</div>
</div>

<style>
	.controls {
		/* margin-bottom: 1rem; */
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex-shrink: 0;
		position: relative;
		z-index: 2;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	.search-input-wrap {
		flex: 1;
		display: flex;
		position: relative;
	}

	.search-input-inner {
		flex: 1;
		display: flex;
		position: relative;
		z-index: 2;
	}

	.search-input-inner input {
		min-width: 0;
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		background: none;
		border: none;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
		color: var(--c-text-muted);
		padding: 0.15rem 0.3rem;
		border-radius: 4px;
		font-family: inherit;
		transition: color 0.1s;
	}

	@media (hover: hover) {
		.search-clear:hover {
			color: var(--c-text);
		}
	}

	.search-box input {
		flex: 1;
		min-width: 0;
		padding: 0.625rem 1rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
		background: var(--c-surface);
		color: var(--c-text);
		position: relative;
		z-index: 1;
	}

	.search-box input:focus {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px rgba(91, 106, 191, 0.1);
	}

	.word-counter {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		padding: 0.625rem 0;
		margin-left: -1.5px;
		border: 1.5px solid var(--c-border);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.tags-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		min-height: 1.8rem;
	}

	.grid-header {
		position: sticky;
		top: var(--thead-top, 0);
		z-index: 1;
	}

	.grid-header > * {
		background: var(--c-surface);
		padding: 0.75rem 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		border-bottom: 2px solid var(--c-border);
		text-align: left;
		white-space: nowrap;
	}

	.grid-header > *:first-child {
		border-radius: var(--radius) 0 0 0;
	}

	.grid-header > *:last-child {
		border-radius: 0 var(--radius) 0 0;
	}

	.sort-btn {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		padding-right: 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (hover: hover) {
		.sort-btn:hover {
			color: var(--c-primary);
		}
	}

	@media (width > 640px) {
		.grid-header .col-word {
			display: flex;
			gap: 1rem;
			align-items: center;
		}
	}

	@media (width <= 1024px) {
		.controls {
			position: sticky;
			top: 0;
			z-index: 2;
			background: var(--c-bg);
			padding: 0.75rem 0 0;
			/* margin-bottom: 0; */
		}
	}

	@media (width <= 640px) {
		.search-box {
			gap: 0.5rem;
		}

		.search-box input {
			font-size: 0.85rem;
			padding: 0.5rem 0.75rem;
		}

		.word-counter {
			padding: 0.5rem 0;
		}

		.tag-chip {
			padding: 0.2rem 0.5rem;
		}

		.controls {
			padding-bottom: 0.75rem;
			gap: 0.75rem;
		}

		.tags-row {
			justify-content: space-evenly;
		}

		.grid-header {
			display: flex;
			justify-content: space-evenly;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.35rem;
			/* padding-top: 0.5rem; */
			position: static;
			z-index: auto;
		}

		.grid-header > * {
			padding: 0;
			border: none;
			background: none;
			white-space: nowrap;
			width: auto;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--c-text-muted);
		}

		.grid-header > .col-word {
			display: contents;
		}

		.grid-header > .col-trans {
			display: none;
		}

		.grid-header .sort-btn {
			padding: 0.2rem 0.65rem;
			border: 1.5px solid var(--c-border);
			border-radius: 999px;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			background: transparent;
			color: var(--c-text-muted);
			cursor: pointer;
			transition: all 0.15s;
			font-family: inherit;
		}

		.grid-header .sort-btn.active {
			border-color: var(--c-primary);
			color: var(--c-primary);
			background: var(--c-primary-light);
		}
	}
</style>
