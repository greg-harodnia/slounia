<script lang="ts">
	let deferredPrompt: Event | null = null;
	let showPrompt = $state(false);

	function handleBeforeInstall(e: Event) {
		e.preventDefault();
		deferredPrompt = e;
		showPrompt = true;
	}

	async function install() {
		if (!deferredPrompt) return;
		(deferredPrompt as any).prompt();
		const result = await (deferredPrompt as any).userChoice;
		if (result.outcome === 'accepted') {
			deferredPrompt = null;
			showPrompt = false;
		}
	}

	function dismiss() {
		showPrompt = false;
		deferredPrompt = null;
	}

	$effect(() => {
		const handler = handleBeforeInstall;
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});
</script>

{#if showPrompt}
	<div class="prompt">
		<div class="prompt-text">
			<strong>Усталяваць аплікацыю</strong>
			<span>Дадайце да галоўнага экрана для хуткага доступу</span>
		</div>
		<div class="prompt-actions">
			<button onclick={dismiss} class="prompt-skip">Не</button>
			<button onclick={install} class="prompt-install">Усталяваць</button>
		</div>
	</div>
{/if}

<style>
	.prompt {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 999;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
		background: var(--c-surface, #1e293b);
		border-top: 1px solid var(--c-border, #334155);
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.prompt-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}

	.prompt-text strong {
		font-size: 0.9rem;
		color: var(--c-text, #e2e8f0);
	}

	.prompt-text span {
		font-size: 0.78rem;
		color: var(--c-text-secondary, #94a3b8);
	}

	.prompt-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.prompt-skip {
		padding: 0.5rem 1rem;
		border: 1px solid var(--c-border, #334155);
		border-radius: 6px;
		background: transparent;
		color: var(--c-text-secondary, #94a3b8);
		font-size: 0.85rem;
		font-family: inherit;
		cursor: pointer;
	}

	.prompt-install {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		background: var(--c-primary, #3b82f6);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
	}
</style>
