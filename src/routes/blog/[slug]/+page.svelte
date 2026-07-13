<script lang="ts">
	import { SITE_URL, SITE_NAME } from '$lib/constants';
	import type { Post } from '$lib/types';
	import BlogPostContent from '$lib/components/BlogPostContent.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	/* svelte-ignore state_referenced_locally */
	let post = $state<Post | null>(data.post);

	onMount(() => {
		if (!post) {
			const slug = decodeURIComponent(window.location.pathname.split('/blog/')[1]);
			fetch(`/api/blog/${encodeURIComponent(slug)}`)
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => {
					post = d && !d.error ? d : null;
				})
				.catch(() => {
					post = null;
				});
		}
	});

	let excerpt = $derived(
		post?.content
			.replace(/<[^>]*>/g, '')
			.trim()
			.slice(0, 160) ?? '',
	);

	const blogLd = $derived(
		post
			? JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'BlogPosting',
					headline: post.title,
					datePublished: post.published_at,
					dateModified: post.updated_at || post.published_at,
					url: `${SITE_URL}/blog/${post.slug}`,
					image: `${SITE_URL}/pwa-512x512.png`,
					inLanguage: ['be', 'be-tarask'],
					author: {
						'@type': 'Organization',
						name: SITE_NAME,
						url: SITE_URL,
					},
					publisher: {
						'@type': 'Organization',
						name: SITE_NAME,
						url: SITE_URL,
					},
				})
			: null,
	);

	const blogLdHtml = $derived(blogLd ? '<script type="application/ld+json">' + blogLd + '<' + '/script>' : '');
</script>

<svelte:head>
	{#if post}
		<title>{post.title} — Блёґ Слоўні</title>
		<meta name="description" content={excerpt || post.title} />
		<meta property="og:title" content="{post.title} — {SITE_NAME}" />
		<meta property="og:description" content={excerpt || post.title} />
		<meta property="og:type" content="article" />
		<meta property="og:url" content="{SITE_URL}/blog/{post.slug}" />
		<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
		<meta property="article:published_time" content={post.published_at} />
		<meta name="twitter:title" content="{post.title} — {SITE_NAME}" />
		<meta name="twitter:description" content={excerpt || post.title} />
		<meta name="twitter:image" content="{SITE_URL}/pwa-512x512.png" />
		{@html blogLdHtml}
	{/if}
</svelte:head>

<div class="page-wrapper page-full">
	{#if post}
		<div class="breadcrumb-wrap">
			<Breadcrumb items={[{ href: '/' }, { href: '/blog' }, { label: post.title }]} />
		</div>
		<div class="page-scroll">
			<BlogPostContent {post} />
		</div>
	{:else}
		<div class="loading">Ладаваньне...</div>
	{/if}
</div>

<style>
	.page-scroll {
		flex: 1;
		min-height: 0;
		overflow: hidden;
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
