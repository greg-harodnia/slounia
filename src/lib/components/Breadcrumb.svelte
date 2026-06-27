<script lang="ts">
	import type { Crumb } from '$lib/types';
	import { r } from '$lib/constants';

	const labels: Record<string, string> = {
		'/': 'Галоўная',
		'/blog': 'Блёґ',
	};

	let { items }: { items: Crumb[] } = $props();

	function breadcrumbLabel(item: Crumb): string {
		return item.label ?? (item.href ? labels[item.href] : undefined) ?? 'Галоўная';
	}
</script>

<nav class="breadcrumb">
	{#each items as item, i (i)}
		{@const crumbLabel = breadcrumbLabel(item)}
		{@const isHome = item.href === '/' || crumbLabel === 'Галоўная'}
		{#if i > 0}<span class="sep">›</span>{/if}
		{#if item.onclick}
			<button class="crumb" onclick={item.onclick}>
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M10 2L2 10h2v8h5v-5h2v5h5v-8h2L10 2z" /></svg
					>
				{:else}
					{crumbLabel}
				{/if}
			</button>
		{:else if item.href}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={r(item.href)} class="crumb">
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M10 2L2 10h2v8h5v-5h2v5h5v-8h2L10 2z" /></svg
					>
				{:else}
					{crumbLabel}
				{/if}
			</a>
		{:else}
			<span class="crumb crumb-current">
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M10 2L2 10h2v8h5v-5h2v5h5v-8h2L10 2z" /></svg
					>
				{:else}
					{crumbLabel}
				{/if}
			</span>
		{/if}
	{/each}
</nav>

<style>
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow: hidden;
		flex: 1;
	}
	.crumb {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		color: var(--c-primary);
		font-size: 0.9rem;
		font-weight: 600;
		line-height: inherit;
		font-family: inherit;
		padding: 0;
		cursor: pointer;
		text-decoration: none;
	}
	.crumb:hover {
		text-decoration: underline;
	}
	.crumb-current {
		color: var(--c-text-muted);
		cursor: default;
		font-weight: 400;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
	.crumb-current:hover {
		text-decoration: none;
	}
	.sep {
		color: var(--c-text-muted);
		font-size: 0.9rem;
	}
	.home-icon {
		display: block;
	}
</style>
