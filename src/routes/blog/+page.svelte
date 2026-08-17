<script lang="ts">
	import { SITE_URL, SITE_NAME } from '$lib/constants';
	import BlogAdmin from '$lib/components/BlogAdmin.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import ToDict from '$lib/components/ToDict.svelte';
	import { onMount } from 'svelte';
	import { blogStore } from '$lib/stores/blogStore.svelte';
	import { replaceState } from '$app/navigation';

	let { data } = $props();

	const description = `Артыкулы пра мовазнаўства, цікавосткі й іншае.`;

	// Covers the SSR first paint (crawlers + no-JS) and client-side
	// navigation back/forward: seed the store from the server load so the
	// singleton never lags behind the current URL. Client-side pagination and
	// hashtag toggling don't re-run the load, so they keep control of the store.
	$effect(() => {
		blogStore.posts = data.posts;
		blogStore.total = data.total;
		blogStore.currentPage = data.page;
		blogStore.hashtagFilter = data.hashtag;
		blogStore.loading = false;
		blogStore.error = false;
	});

	function handlePageChange(page: number) {
		blogStore.goToPage(page);
		const url = new URL(window.location.href);
		if (page === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(page));
		}
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		replaceState(url.pathname + url.search, {});
	}

	onMount(async () => {
		const url = new URL(window.location.href);
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const hashtag = url.searchParams.get('hashtag');
		// If the SSR load already delivered the requested page, the store is
		// seeded by $effect — no need to refetch. If the load errored while the
		// client works, try again here (the store shows the error UI meanwhile).
		if (data.posts.length > 0 && data.page === page && (data.hashtag ?? null) === (hashtag ?? null)) {
			return;
		}
		if (hashtag) blogStore.hashtagFilter = hashtag;
		await blogStore.fetchPage(page);
	});
</script>

<svelte:head>
	<title>Блёґ — {SITE_NAME}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content="Блёґ — {SITE_NAME}" />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{SITE_URL}/blog" />
	<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
	<meta name="twitter:title" content="Блёґ — {SITE_NAME}" />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content="{SITE_URL}/pwa-512x512.png" />
</svelte:head>

<div class="page-wrapper page-full">
	<div class="breadcrumb-wrap"><Breadcrumb items={[{ href: '/' }, { label: 'Блёґ' }]} /><ToDict /></div>
	<h1 class="shrink-0">Блёґ</h1>

	<button
		class="tag-chip tag-chip--block pill tag-pill"
		class:active={blogStore.hashtagFilter === 'мовазнаўства'}
		onclick={() => blogStore.toggleHashtag('мовазнаўства')}
	>
		Мовазнаўства
	</button>

	{#if !import.meta.env.PROD}
		<div class="dev-bar shrink-0">
			<BlogAdmin posts={blogStore.posts} onChange={() => blogStore.fetchPage(blogStore.currentPage)} />
		</div>
	{/if}

	{#if blogStore.loading}
		<p class="empty">Ладаваньне...</p>
	{:else if blogStore.error}
		<div class="empty">
			<div>
				<p>Не ўдалося заладаваць блёґ.</p>
				<button class="pill" onclick={() => blogStore.fetchPage(blogStore.currentPage)}>
					Паспрабаваць ізноў
				</button>
			</div>
		</div>
	{:else if blogStore.posts.length === 0}
		<p class="empty">Пакуль няма допісаў.</p>
	{:else}
		<div class="posts-list scroll-y">
			{#each blogStore.posts as post (post.id)}
				<BlogCard {post} href="/blog/{post.slug}" />
			{/each}
		</div>
	{/if}

	<Pagination currentPage={blogStore.currentPage} totalPages={blogStore.totalPages} onPageChange={handlePageChange} />
</div>

<style>
	h1 {
		font-size: 2rem;
		font-weight: 800;
		margin: 0 0 1.5rem;
		color: var(--c-text);
	}

	.empty {
		flex: 1;
		display: grid;
		place-items: center;
		color: var(--c-text-muted);
		font-size: 1rem;
	}

	.empty button {
		margin-top: 0.75rem;
	}

	.dev-bar {
		margin-bottom: 1.5rem;
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (width <= 640px) {
		h1 {
			font-size: 1.35rem;
			margin-bottom: 0.75rem;
		}

		.posts-list {
			gap: 0.6rem;
		}
	}
</style>
