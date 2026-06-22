<script lang="ts">
	import { formatDate, r } from '$lib/constants';
	import type { Post } from '$lib/types';
	import { fetchBlogPost } from '$lib/fetch-blog';

	let {
		post,
		href,
		onclick: clickHandler,
	}: {
		post: Post;
		href?: string;
		onclick?: (slug: string) => void;
	} = $props();

	const published = $derived(formatDate(post.published_at));
</script>

<article class="post-card card" class:pinned={post.is_pinned}>
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={r(href)} class="post-card-link">
			{@render cardContent()}
		</a>
	{:else if clickHandler}
		<button
			class="post-card-link"
			onclick={() => clickHandler(post.slug)}
			onmouseenter={() => fetchBlogPost(post.slug)}
		>
			{@render cardContent()}
		</button>
	{:else}
		<div class="post-card-link">
			{@render cardContent()}
		</div>
		<!-- /refactor for zero duplication  -->
	{/if}
</article>

{#snippet cardContent()}
	<div class="post-card-header">
		<time datetime={post.published_at}>{published}</time>
		{#if post.is_pinned}
			<span class="pinned-badge">Замацаванае</span>
		{/if}
	</div>
	<h2 class="post-card-title">{post.title}</h2>
	{#if post.hashtags.length > 0}
		<div class="post-card-tags">
			{#each post.hashtags as tag (tag)}
				<span class="tag">{tag}</span>
			{/each}
		</div>
	{/if}
{/snippet}

<style>
	.post-card {
		transition:
			box-shadow 0.15s,
			border-color 0.15s;
	}
	.post-card.pinned {
		border-color: var(--c-primary);
	}
	.post-card:hover {
		box-shadow: var(--shadow-md);
		border-color: var(--c-primary);
	}

	.post-card-link {
		display: block;
		width: 100%;
		text-align: left;
		padding: 1.25rem 1.5rem;
		text-decoration: none;
		color: inherit;
		background: none;
		border: none;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		cursor: pointer;
	}

	.post-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.post-card-header time {
		font-size: 0.8rem;
		color: var(--c-text-muted);
	}

	.pinned-badge {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.post-card-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--c-text);
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	.post-card-tags {
		display: flex;
		gap: 0.35rem;
		margin-left: auto;
	}

	.tag {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: var(--c-tag-bg);
		color: var(--c-tag-text);
	}

	@media (max-width: 600px) {
		.post-card-link {
			padding: 1rem;
		}
	}
</style>
