<script lang="ts">
	import type { Snippet } from 'svelte';

	let { header, children, onclose }: { header: Snippet; children: Snippet; onclose?: () => void } = $props();
</script>

<div class="overlay">
	<div class="page-wrapper page-full">
		<div class="overlay-breadcrumb">
			{@render header()}
			{#if onclose}
				<button class="close-btn" onclick={onclose} aria-label="Close">&times;</button>
			{/if}
		</div>
		<div class="overlay-scroll">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: var(--c-bg);
		animation: overlay-in 0.2s ease;
	}

	@keyframes overlay-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.overlay-breadcrumb {
		position: relative;
		margin-bottom: 1.5rem;
		padding-right: 1.75rem;
		flex-shrink: 0;
	}

	.close-btn {
		position: absolute;
		top: 0;
		right: 0;
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		color: var(--c-text-muted);
		padding: 0;
		font-family: inherit;
	}

	.close-btn:hover {
		color: var(--c-text);
	}

	.overlay-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
</style>
