<script lang="ts">
	import type { Post, Crumb } from '$lib/types';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogPostContent from '$lib/components/BlogPostContent.svelte';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { fetchBlogPost, getCachedBlogPost } from '$lib/fetch-blog';
	import { blogStore } from '$lib/stores/blogStore.svelte';
	import { userStore } from '$lib/stores/userStore.svelte';

	let {
		onOpenPost,
		initialSlug,
		onclose,
		onBackToBlog,
	}: { onOpenPost: (slug: string) => void; initialSlug?: string; onclose: () => void; onBackToBlog?: () => void } =
		$props();

	let currentPost = $state<Post | null>(null);
	let loadingPost = $state(false);
	let postError = $state(false);

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
	}

	$effect(() => {
		if (initialSlug) {
			const cached = getCachedBlogPost(initialSlug);
			if (cached) {
				currentPost = cached;
				postError = false;
				userStore.syncLikeCounts([], [], [initialSlug]);
			} else {
				loadingPost = true;
				postError = false;
				fetchBlogPost(initialSlug).then((status) => {
					loadingPost = false;
					if (status === 'ok') {
						currentPost = getCachedBlogPost(initialSlug) ?? null;
						userStore.syncLikeCounts([], [], [initialSlug]);
					} else if (status === 'error') {
						currentPost = null;
						postError = true;
					} else {
						currentPost = null;
					}
				});
			}
		} else {
			currentPost = null;
			postError = false;
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
	{:else if postError}
		<p class="empty">Не ўдалося заладаваць допіс. Спраўдзьце падлучэньне да інтэрнэту.</p>
	{:else}
		<div class="blog-list">
			<h1 class="page-title">Блёґ</h1>

			<button
				class="tag-chip tag-chip--block pill tag-pill"
				class:active={blogStore.hashtagFilter === 'мовазнаўства'}
				onclick={() => blogStore.toggleHashtag('мовазнаўства')}
			>
				Мовазнаўства
			</button>

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
						<BlogCard {post} onclick={onOpenPost} />
					{/each}
				</div>
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
		flex: 1;
		display: grid;
		place-items: center;
		color: var(--c-text-muted);
		font-size: 1rem;
	}

	.empty button {
		margin-top: 0.75rem;
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
