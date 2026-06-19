<script lang="ts">
	import { onMount } from 'svelte';
	import Modal from './Modal.svelte';
	import StressInput from './StressInput.svelte';
	import StressBtn from './StressBtn.svelte';
	import { importanceLevels } from '$lib/constants';

	let {
		word,
		onWordEdited,
	}: {
		word: { id: string; comment: string | null; importance: { id: number | null }; tags: string[] };
		onWordEdited: () => void;
	} = $props();

	let open = $state(false);
	let wordId = $state('');
	let comment = $state('');
	let importanceId = $state<number | ''>('');
	let selectedTagIds = $state<number[]>([]);
	let allTags = $state<Array<{ id: number; name: string }>>([]);
	let submitting = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/tags');
			allTags = await res.json();
		} catch (e) {
			console.error(e);
		}
	});

	function openModal() {
		wordId = word.id;
		comment = word.comment ?? '';
		importanceId = word.importance.id ?? '';
		selectedTagIds = allTags.filter((t) => word.tags.includes(t.name)).map((t) => t.id);
		error = '';
		open = true;
	}

	function toggleTag(tagId: number) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	async function handleSubmit() {
		error = '';
		submitting = true;
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(word.id)}/edit`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: wordId.trim() || word.id,
					comment: comment.trim() || null,
					importance_id: importanceId || null,
					tag_ids: selectedTagIds,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'Не ўдалося абнавіць слова';
				return;
			}

			open = false;
			onWordEdited();
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

<button class="edit-btn-sm" onclick={openModal} aria-label="Edit word">✎</button>

<Modal title="Рэдагаваць слова" {open} onclose={close}>
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<label>
		Слова
		<StressInput bind:value={wordId} name="word" />
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
			{#each allTags as tag (tag.id)}
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

	{#snippet footer()}
		<StressBtn />
		<button class="cancel-btn" onclick={close}>Скасаваць</button>
		<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
			{submitting ? 'Захаваньне...' : 'Захаваць'}
		</button>
	{/snippet}
</Modal>

<style>
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
</style>
