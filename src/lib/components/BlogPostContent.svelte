<script lang="ts">
	import { formatDate } from '$lib/constants';
	import type { Post } from '$lib/types';
	import BlogLikeButton from '$lib/components/BlogLikeButton.svelte';

	let { post }: { post: Post } = $props();

	const published = $derived(formatDate(post.published_at));
</script>

<article class="post card">
	<header class="post-header">
		<div class="post-meta">
			<time datetime={post.published_at} class="post-date">{published}</time>
			{#if post.is_pinned}
				<span class="pinned-badge">Замацавана</span>
			{/if}
			{#if post.hashtags.length > 0}
				<div class="post-tags">
					{#each post.hashtags as tag (tag)}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
		<h1 class="post-title">{post.title}</h1>
	</header>

	<div class="post-content">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html post.content}
	</div>

	<footer class="post-footer">
		<BlogLikeButton slug={post.slug} likes={post.likes} />
	</footer>
</article>

<style>
	.post {
		max-height: 100%;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 2rem 2.5rem;
	}

	.post-header {
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--c-border);
	}

	.post-meta {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.post-date {
		font-size: 0.85rem;
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

	.post-title {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--c-text);
		line-height: 1.3;
		margin: 0.25rem 0 0;
	}

	.post-tags {
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

	.post-content {
		padding: 2rem 0;
		font-size: 1rem;
		line-height: 1.75;
		color: var(--c-text);
	}
	.post-content :global(p) {
		margin-bottom: 1rem;
	}
	.post-content :global(p:last-child) {
		margin-bottom: 0;
	}
	.post-content :global(h2) {
		font-size: 1.35rem;
		font-weight: 700;
		margin: 2rem 0 0.75rem;
		color: var(--c-text);
	}
	.post-content :global(h3) {
		font-size: 1.15rem;
		font-weight: 700;
		margin: 1.5rem 0 0.5rem;
		color: var(--c-text);
	}
	.post-content :global(ul),
	.post-content :global(ol) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}
	.post-content :global(li) {
		margin-bottom: 0.35rem;
	}
	.post-content :global(blockquote) {
		border-left: 3px solid var(--c-primary);
		padding-left: 1rem;
		margin: 1rem 0;
		color: var(--c-text-muted);
		font-style: italic;
	}
	.post-content :global(a) {
		color: var(--c-primary);
		text-decoration: underline;
	}
	.post-content :global(img) {
		max-width: 100%;
		display: block;
		margin: 1rem auto;
		border-radius: var(--radius-sm);
	}
	.post-content :global(code) {
		background: var(--c-tag-bg);
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-size: 0.9em;
	}
	.post-content :global(pre) {
		background: var(--c-bg);
		padding: 1rem;
		border-radius: var(--radius-sm);
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	.post-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.post-footer {
		padding-top: 1.5rem;
		border-top: 1px solid var(--c-border);
		flex-shrink: 0;
	}

	@media (max-width: 600px) {
		.post {
			padding: 1.25rem 1rem;
		}
		.post-meta {
			gap: 0.5rem;
		}
		.post-title {
			font-size: 1.35rem;
		}
		.post-content {
			padding: 1rem 0;
		}
	}
</style>
