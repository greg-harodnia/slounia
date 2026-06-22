<script lang="ts">
	import type { Post, Crumb } from '$lib/types';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import BlogPostContent from '$lib/components/BlogPostContent.svelte';
	import OverlayShell from '$lib/components/OverlayShell.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { fetchBlogList, fetchBlogPost, getCachedBlogList, getCachedBlogPost } from '$lib/fetch-blog';

	let {
		onOpenPost,
		initialSlug,
		onclose,
		onBackToBlog,
	}: { onOpenPost: (slug: string) => void; initialSlug?: string; onclose: () => void; onBackToBlog?: () => void } =
		$props();

	let posts = $state<Post[]>([]);
	let currentPost = $state<Post | null>(null);
	let loadingPosts = $state(false);
	let loadingPost = $state(false);

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
			if (posts.length === 0) {
				const cached = getCachedBlogList();
				if (cached) {
					posts = cached;
				} else {
					loadingPosts = true;
					fetchBlogList().then(() => {
						posts = getCachedBlogList() ?? [];
						loadingPosts = false;
					});
				}
			}
		}
	});
</script>

{#snippet header()}
	<Breadcrumb items={breadcrumbs} />
{/snippet}

<OverlayShell {header} {onclose}>
	{#if !currentPost}
		<h1 class="page-title">Блёґ</h1>

		{#if loadingPosts}
			<p class="empty">Ладаваньне...</p>
		{:else if posts.length === 0}
			<p class="empty">Пакуль няма допісаў.</p>
		{:else}
			<div class="posts-list">
				{#each posts as post (post.id)}
					<BlogCard {post} onclick={onOpenPost} />
				{/each}
			</div>
		{/if}
	{:else if loadingPost}
		<p class="empty">Ладаваньне...</p>
	{:else}
		<BlogPostContent post={currentPost} />
	{/if}
</OverlayShell>

<style>
	.page-title {
		font-size: 2rem;
		font-weight: 800;
		color: var(--c-text);
		margin: 0 0 2rem;
		flex-shrink: 0;
	}

	.empty {
		color: var(--c-text-muted);
		font-size: 1rem;
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
