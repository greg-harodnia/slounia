<script lang="ts">
	import Modal from './Modal.svelte';
	import StressInput from './StressInput.svelte';
	import StressBtn from './StressBtn.svelte';

	let {
		wordId = '',
		translation,
		onDone,
	}: {
		wordId?: string;
		translation?: { id: number; translation: string; comment: string | null };
		onDone: () => void;
	} = $props();

	const isEdit = $derived(translation !== undefined);

	let open = $state(false);
	let text = $state('');
	let comment = $state('');
	let submitting = $state(false);
	let error = $state('');

	function openForAdd() {
		text = '';
		comment = '';
		error = '';
		open = true;
	}

	function openForEdit() {
		text = translation!.translation;
		comment = translation!.comment ?? '';
		error = '';
		open = true;
	}

	async function handleSubmit() {
		error = '';
		if (!text.trim()) {
			error = 'Пераклад абавязковы';
			return;
		}

		submitting = true;
		try {
			const url = isEdit
				? `/api/translations/${translation!.id}/edit`
				: `/api/words/${encodeURIComponent(wordId)}/add-translation`;
			const res = await fetch(url, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					translation: text.trim(),
					comment: comment.trim() || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || (isEdit ? 'Не ўдалося абнавіць пераклад' : 'Не ўдалося дадаць пераклад');
				return;
			}

			open = false;
			onDone();
		} catch (e) {
			error = 'Памылка сеткі';
			console.error(e);
		} finally {
			submitting = false;
		}
	}

	function close() {
		open = false;
		error = '';
	}
</script>

<button
	class={isEdit ? 'edit-btn-sm' : 'add-trans-btn'}
	onclick={isEdit ? openForEdit : openForAdd}
	aria-label={isEdit ? 'Edit translation' : undefined}
>
	{isEdit ? '✎' : '+'}
</button>

<Modal title={isEdit ? 'Рэдагаваць пераклад' : 'Дадаць пераклад'} {open} onclose={close}>
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<label>
		Пераклад *
		<StressInput bind:value={text} placeholder="Пераклад" name="translation" />
	</label>

	<label>
		Камэнтар
		<StressInput bind:value={comment} placeholder="Неабавязковы камэнтар" name="translation-comment" multiline />
	</label>

	{#snippet footer()}
		<StressBtn />
		<button class="cancel-btn" onclick={close}>Скасаваць</button>
		<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
			{submitting ? 'Захаваньне...' : 'Захаваць'}
		</button>
	{/snippet}
</Modal>

<style>
	.add-trans-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: 1.5px dashed var(--c-border);
		border-radius: 50%;
		background: transparent;
		color: var(--c-text-muted);
		font-size: 1rem;
		cursor: pointer;
		font-family: inherit;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.add-trans-btn:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
		background: var(--c-primary-light);
	}

	.edit-btn-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--c-text-muted);
		font-size: 0.85rem;
		cursor: pointer;
		font-family: inherit;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.edit-btn-sm:hover {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}
</style>
