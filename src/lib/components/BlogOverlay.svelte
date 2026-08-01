<script lang="ts">
	import type { Post, Crumb } from '$lib/types';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogPostContent from '$lib/components/BlogPostContent.svelte';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import ListLoading from '$lib/components/ListLoading.svelte';
	import { fetchBlogPost, getCachedBlogPost } from '$lib/fetch-blog';
	import { blogStore } from '$lib/stores/blogStore.svelte';

	let {
		onOpenPost,
		initialSlug,
		onclose,
		onBackToBlog,
	}: { onOpenPost: (slug: string) => void; initialSlug?: string; onclose: () => void; onBackToBlog?: () => void } =
		$props();

	let currentPost = $state<Post | null>(null);
	let loadingPost = $state(false);
	let listEl: HTMLDivElement | undefined = $state();

	let breadcrumbs = $derived.by(() => {
		if (currentPost) {
			return [
				{ label: 'Галоўная', onclick: onclose } as Crumb,
				{ label: 'Блёґ', onclick: onBackToBlog } as Crumb,
				{ label: currentPost.title },
			];
		}
		return [{ label: 'Галоўная', onclick: onclose } as Crumb, { label: 'Блёґ' }];
	});

	function handlePageChange(page: number) {
		blogStore.goToPage(page);
		const url = new URL(window.location.href);
		if (page === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(page));
		}
		history.replaceState(history.state, '', url.pathname + url.search);
		listEl?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	$effect(() => {
		if (initialSlug) {
			const cached = getCachedBlogPost(initialSlug);
			if (cached) {
				currentPost = cached;
			} else {
				loadingPost = true;
				fetchBlogPost(initialSlug).then(() => {
					currentPost = getCachedBlogPost(initialSlug) ?? null;
					loadingPost = false;
				});
			}
		} else {
			currentPost = null;
			if (blogStore.posts.length === 0) {
				const url = new URL(window.location.href);
				const page = parseInt(url.searchParams.get('page') || '1', 10);
				blogStore.fetchPage(page);
			}
		}
	});
</script>

{#snippet header()}
	<Breadcrumb items={breadcrumbs} />
{/snippet}

<OverlayShell {header} {onclose}>
	{#if currentPost}
		<BlogPostContent post={currentPost} />
	{:else if loadingPost}
		<p class="empty">Ладаваньне...</p>
	{:else}
		<div class="blog-list">
			<h1 class="page-title">Блёґ</h1>

			<button
				class="tag-chip"
				class:active={blogStore.hashtagFilter === 'мовазнаўства'}
				onclick={() => blogStore.toggleHashtag('мовазнаўства')}
			>
				Мовазнаўства
			</button>

			{#if blogStore.loading && blogStore.posts.length === 0}
				<p class="empty">Ладаваньне...</p>
			{:else if blogStore.posts.length === 0}
				<p class="empty">Пакуль няма допісаў.</p>
			{:else}
				<div class="posts-list scroll-y" bind:this={listEl}>
					{#each blogStore.posts as post (post.id)}
						<BlogCard {post} onclick={onOpenPost} />
					{/each}
				</div>
			{/if}

			{#if blogStore.loading && blogStore.posts.length > 0}
				<ListLoading />
			{/if}

			<Pagination
				currentPage={blogStore.currentPage}
				totalPages={blogStore.totalPages}
				onPageChange={handlePageChange}
			/>
		</div>
	{/if}
</OverlayShell>

<style>
	.page-title {
		font-size: 2rem;
		font-weight: 800;
		color: var(--c-text);
		margin: 0 0 1.5rem;
		flex-shrink: 0;
	}

	.empty {
		color: var(--c-text-muted);
		font-size: 1rem;
	}

	.blog-list {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (width <= 640px) {
		.page-title {
			font-size: 1.35rem;
			margin-bottom: 0.75rem;
		}

		.posts-list {
			gap: 0.6rem;
		}
	}
</style>
