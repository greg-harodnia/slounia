<div class="list-loading" role="status" aria-live="polite">
	<span class="spinner" aria-hidden="true"></span>
	Ладаваньне...
</div>

<style>
	.list-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		font-size: 0.85rem;
		color: var(--c-text-muted);
		flex-shrink: 0;
	}

	.spinner {
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid var(--c-border);
		border-top-color: var(--c-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
