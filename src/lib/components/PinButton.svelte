<script lang="ts">
	let { pinned, onclick }: { pinned: boolean; onclick: () => void } = $props();
</script>

<button class="icon-btn" class:active={pinned} {onclick} aria-label={pinned ? 'Адмацаваць' : 'Замацаваць'}>
	<svg
		viewBox="0 0 24 24"
		width="14"
		height="14"
		fill={pinned ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
	</svg>
</button>

<style>
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-left: 0.5rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--c-text);
		font-size: 0.8rem;
		cursor: pointer;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
		opacity: 0.4;
		vertical-align: middle;
	}

	@media (hover: hover) {
		.icon-btn:hover {
			opacity: 1;
			background: var(--c-primary-light);
		}
	}

	.icon-btn.active {
		color: var(--c-primary);
		opacity: 1;
	}
	@media (hover: hover) {
		.icon-btn.active:hover {
			background: var(--c-primary-light);
		}
	}
</style>
