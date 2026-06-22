<script lang="ts">
	import type { WordData, Crumb } from '$lib/types';
	import WordDetailContent from '$lib/components/WordDetailContent.svelte';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { fetchWord, getCachedWord } from '$lib/fetch-word';

	let {
		initialWordId,
		initialWord,
		onWordLink,
		onclose,
	}: { initialWordId?: string; initialWord?: WordData; onWordLink?: (wordId: string) => void; onclose: () => void } =
		$props();

	/* svelte-ignore state_referenced_locally */
	let word = $state<WordData | null>(initialWord ?? null);
	let loading = $state(false);
	let fetchingId = $state<string | null>(null);

	let breadcrumbs = $derived.by(() => {
		const entries: Crumb[] = [{ label: 'Галоўная', onclick: onclose }];
		if (word) {
			entries.push({ label: word.id });
		} else {
			entries.push({ label: loading ? 'Ладаваньне...' : '...' });
		}
		return entries;
	});

	$effect(() => {
		const id = initialWordId;
		if (!id) return;
		if (initialWord) {
			word = initialWord;
			fetchingId = null;
		} else if (word?.id !== id && fetchingId !== id) {
			const cached = getCachedWord(id);
			if (cached) {
				word = cached;
				return;
			}
			word = null;
			loading = true;
			fetchingId = id;
			fetchWord(id).then(() => {
				if (fetchingId === id) {
					word = getCachedWord(id) ?? null;
					loading = false;
				}
			});
		}
	});
</script>

{#snippet header()}
	<Breadcrumb items={breadcrumbs} />
{/snippet}

<OverlayShell {header} {onclose}>
	{#if loading}
		<p class="msg">Ладаваньне...</p>
	{:else if word}
		<WordDetailContent {word} {onWordLink} />
	{:else}
		<p class="msg">Слова ня знойдзенае</p>
	{/if}
</OverlayShell>

<style>
	.msg {
		color: var(--c-text-muted);
		font-size: 1rem;
	}
</style>
