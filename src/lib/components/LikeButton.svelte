<script lang="ts">
	let {
		liked,
		count,
		onclick,
		label,
		small = false,
		post = false,
	}: {
		liked: boolean;
		count: number;
		onclick: () => void;
		label?: string;
		small?: boolean;
		post?: boolean;
	} = $props();
</script>

<button
	class="like-btn"
	class:liked
	class:like-btn--sm={small}
	class:like-btn--post={post}
	{onclick}
	aria-label={label ?? 'Like'}
>
	♥ {count}
</button>

<style>
	.like-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 1.5px solid var(--c-border);
		border-radius: 999px;
		background: var(--c-surface);
		cursor: pointer;
		font-weight: 600;
		transition: all 0.15s;
		font-family: inherit;
		padding: 0.35rem 0.85rem;
		font-size: 0.85rem;
		color: var(--c-text);
	}

	.like-btn--sm {
		padding: 0.15rem 0.5rem;
		font-size: 0.75rem;
		color: var(--c-text-muted);
		border-color: transparent;
		background: transparent;
	}

	.like-btn--post {
		gap: 0.35rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		color: var(--c-text-muted);
	}

	@media (hover: hover) {
		.like-btn:hover {
			border-color: var(--c-like);
			color: var(--c-like);
			background: var(--c-like-light);
		}
	}

	.like-btn.liked {
		border-color: var(--c-like);
		color: var(--c-like);
		background: var(--c-like-light);
	}
</style>
