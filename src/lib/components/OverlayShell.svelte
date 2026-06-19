<script lang="ts">
	import type { Snippet } from 'svelte';

	let { header, children }: { header: Snippet; children: Snippet } = $props();
</script>

<div class="overlay">
	<div class="page-wrapper page-full">
		<div class="overlay-breadcrumb">
			{@render header()}
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
		margin-bottom: 1.5rem;
		flex-shrink: 0;
	}

	.overlay-scroll {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
</style>
