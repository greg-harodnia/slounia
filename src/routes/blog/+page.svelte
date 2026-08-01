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

	let _data = $props();

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
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(async () => {
		const url = new URL(window.location.href);
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		await blogStore.fetchPage(page);
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
	<div class="breadcrumb-wrap"><Breadcrumb items={[{ href: '/' }, { label: 'Блёґ' }]} /><ToDict /></div>
	<h1 class="shrink-0">Блёґ</h1>

	<button
		class="tag-chip"
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

	{#if blogStore.loading && blogStore.posts.length === 0}
		<p class="empty shrink-0">Ладаваньне...</p>
	{:else if blogStore.posts.length === 0}
		<p class="empty shrink-0">Пакуль няма допісаў.</p>
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
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	@media (width <= 640px) {
		h1 {
			font-size: 1.5rem;
			margin-bottom: 1rem;
		}

		.breadcrumb-wrap {
			margin-bottom: 1rem;
		}

		.posts-list {
			gap: 0.75rem;
		}
	}
</style>
