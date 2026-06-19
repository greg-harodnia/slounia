<script lang="ts">
	let lastFocus: HTMLInputElement | HTMLTextAreaElement | null = null;

	function onFocus(e: FocusEvent) {
		const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
		if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
			lastFocus = el;
		}
	}

	$effect(() => {
		document.addEventListener('focusin', onFocus);
		return () => document.removeEventListener('focusin', onFocus);
	});

	function insertStress() {
		const el = lastFocus;
		if (!el) return;
		const start = el.selectionStart ?? el.value.length;
		const end = el.selectionEnd ?? start;
		const val = el.value;
		el.value = val.slice(0, start) + '\u0301' + val.slice(end);
		el.dispatchEvent(new Event('input', { bubbles: true }));
		requestAnimationFrame(() => {
			el.focus();
			el.selectionStart = el.selectionEnd = start + 1;
		});
	}
</script>

<button class="stress-btn" onclick={insertStress} type="button" title="Уставіць націск (у актыўнае поле)">́</button>

<style>
	.stress-btn {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border: 1.5px solid var(--c-border);
		border-radius: 50%;
		background: var(--c-surface);
		color: var(--c-primary);
		font-size: 1.1rem;
		font-weight: 700;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
		line-height: 1;
		transition: all 0.15s;
	}
	.stress-btn:hover {
		border-color: var(--c-primary);
		background: var(--c-primary-light);
	}
</style>
