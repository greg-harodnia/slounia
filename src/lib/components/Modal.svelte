<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		open,
		onclose,
		children,
		footer,
		closeOnOverlay = false,
		wide = true,
	}: {
		title: string;
		open: boolean;
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
		closeOnOverlay?: boolean;
		wide?: boolean;
	} = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="modal-overlay"
		onclick={(e) => {
			if (closeOnOverlay && e.target === e.currentTarget) onclose();
		}}
	>
		<div class="modal" class:wide>
			<div class="modal-header">
				<h2>{title}</h2>
				<button class="close-btn" onclick={onclose}>×</button>
			</div>
			<div class="modal-body">
				{@render children()}
			</div>
			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		background: var(--c-surface);
		border-radius: var(--radius);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.modal.wide {
		max-width: 800px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid var(--c-border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.modal-body {
		padding: 1rem 1.5rem;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-body :global(label) {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.modal-body :global(input),
	.modal-body :global(select),
	.modal-body :global(textarea) {
		padding: 0.6rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-family: inherit;
		background: var(--c-surface);
		color: var(--c-text);
		outline: none;
		transition: border-color 0.15s;
	}
	.modal-body :global(textarea) {
		min-height: 80px;
		resize: vertical;
	}
	.modal-body :global(input:focus),
	.modal-body :global(select:focus),
	.modal-body :global(textarea:focus) {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 20%, transparent);
	}
	.modal-body :global(input:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem 1.25rem;
		border-top: 1px solid var(--c-border);
	}

	.modal-body :global(.error-msg) {
		padding: 0.6rem 1rem;
		background: var(--c-like-light);
		color: var(--c-like);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 500;
		border: 1px solid var(--c-like);
	}

	.modal-footer :global(.cancel-btn),
	.modal-footer :global(.submit-btn) {
		padding: 0.6rem 1.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.15s;
		border: 1.5px solid var(--c-border);
	}

	.modal-footer :global(.cancel-btn) {
		background: var(--c-surface);
		color: var(--c-text);
	}
	.modal-footer :global(.cancel-btn:hover) {
		background: var(--c-surface-hover);
	}

	.modal-footer :global(.submit-btn) {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}
	.modal-footer :global(.submit-btn:hover) {
		opacity: 0.85;
	}
	.modal-footer :global(.submit-btn:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
