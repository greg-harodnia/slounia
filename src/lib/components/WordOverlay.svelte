<script lang="ts">
	import type { WordData, Crumb } from '$lib/types';
	import WordDetailContent from '$lib/components/WordDetailContent.svelte';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { fetchWord, getCachedWord } from '$lib/fetch-word';
	import { userStore } from '$lib/stores/userStore.svelte';

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
	let error = $state(false);

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
			loading = false;
			error = false;
			userStore.syncLikeCounts(
				[id],
				initialWord.translations.map((t) => t.id),
			);
		} else if (word?.id !== id && fetchingId !== id) {
			const cached = getCachedWord(id);
			if (cached) {
				word = cached;
				fetchingId = null;
				loading = false;
				error = false;
				userStore.syncLikeCounts(
					[id],
					cached.translations.map((t) => t.id),
				);
				return;
			}
			fetchingId = id;
			loading = true;
			error = false;
			fetchWord(id).then((status) => {
				if (fetchingId !== id) return;
				loading = false;
				if (status === 'ok') {
					word = getCachedWord(id) ?? null;
					if (word)
						userStore.syncLikeCounts(
							[id],
							word.translations.map((t) => t.id),
						);
				} else if (status === 'error') {
					word = null;
					error = true;
				} else {
					word = null;
				}
			});
		}
	});
</script>

{#snippet header()}
	<Breadcrumb items={breadcrumbs} />
{/snippet}

<OverlayShell {header} {onclose}>
	{#if loading && !word}
		<p class="msg">Ладаваньне...</p>
	{:else if word}
		<WordDetailContent {word} {onWordLink} enableViews />
	{:else if error}
		<p class="msg">Не ўдалося заладаваць слова. Спраўдзьце падлучэньне да інтэрнэту.</p>
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
