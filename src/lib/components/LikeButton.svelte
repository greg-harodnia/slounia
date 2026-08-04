<script lang="ts">
	let {
		liked,
		count,
		onclick,
		label,
		small = false,
		large = false,
	}: {
		liked: boolean;
		count: number;
		onclick: () => void;
		label?: string;
		small?: boolean;
		large?: boolean;
	} = $props();
</script>

<button class="pill" class:liked class:pill--sm={small} class:pill--lg={large} {onclick} aria-label={label ?? 'Like'}>
	♥ {count}
</button>

<style>
	.pill {
		cursor: pointer;
		transition: all 0.15s;
	}

	@media (hover: hover) {
		.pill:hover {
			border-color: var(--c-like);
			color: var(--c-like);
			background: var(--c-like-light);
		}
	}

	.pill.liked {
		border-color: var(--c-like);
		color: var(--c-like);
		background: var(--c-like-light);
	}
</style>
