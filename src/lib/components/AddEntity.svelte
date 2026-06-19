<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import StressInput from './StressInput.svelte';
	import StressBtn from './StressBtn.svelte';
	import { importanceLevels } from '$lib/constants';

	let { onWordAdded }: { onWordAdded: () => void } = $props();

	let open = $state(false);
	let word = $state('');
	let comment = $state('');
	let importanceId = $state<number | ''>('');
	let selectedTagIds = $state<number[]>([]);
	let transList = $state<Array<{ translation: string; comment: string }>>([{ translation: '', comment: '' }]);
	let tags = $state<Array<{ id: number; name: string }>>([]);
	let submitting = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/tags');
			tags = await res.json();
		} catch (e) {
			console.error(e);
		}
	});

	function addTranslation() {
		transList = [...transList, { translation: '', comment: '' }];
	}

	function removeTranslation(index: number) {
		if (transList.length > 1) {
			transList = transList.filter((_, i) => i !== index);
		}
	}

	function toggleTag(tagId: number) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	function resetForm() {
		word = '';
		comment = '';
		importanceId = '';
		selectedTagIds = [];
		transList = [{ translation: '', comment: '' }];
		error = '';
	}

	async function handleSubmit() {
		error = '';
		if (!word.trim()) {
			error = 'Слова абавязковае';
			return;
		}
		if (!transList.some((t) => t.translation.trim())) {
			error = 'Патрэбны хаця б адзін пераклад';
			return;
		}

		submitting = true;
		try {
			const res = await fetch('/api/words/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: word.trim(),
					importance_id: importanceId || null,
					comment: comment.trim() || null,
					tag_ids: selectedTagIds,
					translations: transList
						.filter((t) => t.translation.trim())
						.map((t, i) => ({
							translation: t.translation.trim(),
							comment: t.comment.trim() || null,
							sort_order: i,
						})),
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'Не ўдалося дадаць слова';
				return;
			}

			resetForm();
			open = false;
			onWordAdded();
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

<button class="add-btn" onclick={() => (open = true)}>+ Дадаць слова</button>

<Modal title="Дадаць слова" {open} onclose={close}>
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<label>
		Слова *
		<StressInput bind:value={word} placeholder="напрыклад, прывітанне" name="word" />
	</label>

	<label>
		Камэнтар
		<StressInput bind:value={comment} placeholder="Неабавязковы камэнтар" name="word-comment" multiline />
	</label>

	<label>
		Важнасьць
		<select name="word-importance" bind:value={importanceId}>
			<option value="">—</option>
			{#each importanceLevels as imp (imp.id)}
				<option value={imp.id}>{imp.name}</option>
			{/each}
		</select>
	</label>

	<fieldset>
		<legend>Тэґі</legend>
		<div class="tag-grid">
			{#each tags as tag (tag.id)}
				<button
					class="tag-option"
					class:selected={selectedTagIds.includes(tag.id)}
					onclick={() => toggleTag(tag.id)}
					type="button"
				>
					{tag.name}
				</button>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend>Пераклады *</legend>
		{#each transList as _, i (i)}
			<div class="translation-row">
				<StressInput bind:value={transList[i].translation} placeholder="Пераклад" class="trans-input" />
				<StressInput bind:value={transList[i].comment} placeholder="Камэнтар (неабавязкова)" />
				{#if transList.length > 1}
					<button class="remove-btn" onclick={() => removeTranslation(i)} type="button">×</button>
				{/if}
			</div>
		{/each}
		<button class="add-trans-btn" onclick={addTranslation} type="button">+ Дадаць яшчэ пераклад</button>
	</fieldset>

	{#snippet footer()}
		<StressBtn />
		<button class="cancel-btn" onclick={close}>Скасаваць</button>
		<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
			{submitting ? 'Захаваньне...' : 'Захаваць'}
		</button>
	{/snippet}
</Modal>

<style>
	.add-btn {
		flex-shrink: 0;
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		font-family: inherit;
		white-space: nowrap;
	}
	.add-btn:hover {
		opacity: 0.85;
	}

	fieldset {
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		margin: 0;
	}

	legend {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0 0.3rem;
	}

	.tag-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}

	.tag-option {
		padding: 0.3rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: 999px;
		background: var(--c-surface);
		color: var(--c-tag-text);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}
	.tag-option:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}
	.tag-option.selected {
		background: var(--c-tag-active);
		border-color: var(--c-tag-active);
		color: var(--c-tag-active-text);
	}

	.translation-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.5rem;
	}
	.translation-row > :global(.trans-input) {
		flex: 2;
		min-width: 0;
	}

	.remove-btn {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--c-text-muted);
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
	}
	.remove-btn:hover {
		background: var(--c-like-light);
		color: var(--c-like);
	}

	.add-trans-btn {
		margin-top: 0.75rem;
		padding: 0.4rem 0;
		border: 1.5px dashed var(--c-border);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		width: 100%;
		font-family: inherit;
		transition: all 0.15s;
	}
	.add-trans-btn:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}
</style>
