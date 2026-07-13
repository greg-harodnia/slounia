<script lang="ts">
	import { SITE_URL, SITE_NAME } from '$lib/constants';
	import BlogAdmin from '$lib/components/BlogAdmin.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import type { Post } from '$lib/types';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	/* svelte-ignore state_referenced_locally */
	let posts = $state<Post[]>(data.posts);
	/* svelte-ignore state_referenced_locally */
	let total = $state(data.total);
	/* svelte-ignore state_referenced_locally */
	let loading = $state(data.posts.length === 0 && data.total === 0);

	function reload() {
		loading = true;
		fetch('/api/blog')
			.then((r) => r.json())
			.then((d) => {
				posts = d.posts ?? [];
				total = d.total ?? 0;
			})
			.catch(() => {})
			.finally(() => {
				loading = false;
			});
	}

	onMount(() => {
		if (posts.length === 0 && total === 0) {
			reload();
		}
	});
</script>

<svelte:head>
	<title>Блёґ — {SITE_NAME}</title>
	<meta name="description" content="Навіны, артыкулы і іншая карысная інфармацыя пра {SITE_NAME.toLowerCase()}." />
	<meta property="og:title" content="Блёґ — {SITE_NAME}" />
	<meta property="og:description" content="Навіны, артыкулы і іншая карысная інфармацыя пра слоўнічак." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{SITE_URL}/blog" />
	<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
	<meta name="twitter:title" content="Блёґ — {SITE_NAME}" />
	<meta name="twitter:description" content="Блёґ Слоўні" />
	<meta name="twitter:image" content="{SITE_URL}/pwa-512x512.png" />
</svelte:head>

<div class="page-wrapper page-full">
	<div class="breadcrumb-wrap"><Breadcrumb items={[{ href: '/' }, { label: 'Блёґ' }]} /></div>
	<h1 class="shrink-0">Блёґ</h1>

	{#if !import.meta.env.PROD}
		<div class="dev-bar shrink-0">
			<BlogAdmin {posts} onChange={reload} />
		</div>
	{/if}

	{#if loading}
		<p class="empty shrink-0">Ладаваньне...</p>
	{:else if posts.length === 0}
		<p class="empty shrink-0">Пакуль няма допісаў.</p>
	{/if}

	<div class="posts-list scroll-y">
		{#each posts as post (post.id)}
			<BlogCard {post} href="/blog/{post.slug}" />
		{/each}
	</div>
</div>

<style>
	h1 {
		font-size: 2rem;
		font-weight: 800;
		margin: 0 0 2rem;
		color: var(--c-text);
	}

	.empty {
		color: var(--c-text-muted);
		font-size: 1rem;
	}

	.dev-bar {
		margin-bottom: 1.5rem;
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.breadcrumb-wrap {
		margin-bottom: 1.5rem;
	}
</style>
