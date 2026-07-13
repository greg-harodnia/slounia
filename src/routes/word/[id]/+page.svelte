<script lang="ts">
	import { SITE_NAME, SITE_URL } from '$lib/constants';
	import type { WordData } from '$lib/types';
	import WordDetailContent from '$lib/components/WordDetailContent.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores/settings.svelte';

	let { data } = $props();
	/* svelte-ignore state_referenced_locally */
	let word = $state<WordData | null>(data.word);

	onMount(() => {
		settings.load();
		if (!word) {
			fetch(`/api/words/${encodeURIComponent(window.location.pathname.split('/word/')[1])}`)
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => {
					word = d?.word ?? null;
				})
				.catch(() => {
					word = null;
				});
		}
	});

	const wordLd = $derived(
		word
			? JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'DefinedTerm',
					name: word.id,
					description: word.translations.map((t) => t.translation).join(', '),
					inLanguage: ['be', 'be-tarask'],
					url: `${SITE_URL}/word/${word.id}`,
				})
			: null,
	);
	const wordLdHtml = $derived(wordLd ? '<script type="application/ld+json">' + wordLd + '<' + '/script>' : '');
</script>

<svelte:head>
	{#if word}
		<title>{word.id} — {SITE_NAME}</title>
		<meta name="description" content="{word.id} — {word.translations.map((t) => t.translation).join(', ')}" />
		<meta property="og:title" content="{word.id} — {SITE_NAME}" />
		<meta property="og:description" content={word.translations.map((t) => t.translation).join(', ')} />
		<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="{SITE_URL}/word/{word.id}" />
		{@html wordLdHtml}
	{/if}
</svelte:head>

<div class="word-page page-wrapper page-full">
	{#if word}
		<div class="breadcrumb-wrap">
			<Breadcrumb items={[{ href: '/' }, { label: word.id }]} />
		</div>
		<div class="word-scroll">
			<WordDetailContent {word} />
		</div>
	{:else}
		<div class="loading">Ладаваньне...</div>
	{/if}
</div>

<style>
	.word-scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}
	.breadcrumb-wrap {
		margin-bottom: 1.5rem;
	}
	.loading {
		color: var(--c-text-muted);
		padding: 2rem;
		text-align: center;
	}
</style>
