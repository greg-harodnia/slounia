<script lang="ts">
	import type { Crumb } from '$lib/types';
	import { resolve } from '$app/paths';

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
		{@const isHome = item.href === '/'}
		{#if i > 0}<span class="sep">›</span>{/if}
		{#if item.go}
			<button class="crumb" onclick={() => history.go(-item.go!)}>
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M3 4c2-1 5-2 7 0s5-1 7 0v12c-2-1-5-2-7 0s-5-1-7 0V4z" /></svg
					>
				{:else}
					{crumbLabel}
				{/if}
			</button>
		{:else if item.href}
			<a href={resolve(item.href)} class="crumb">
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M3 4c2-1 5-2 7 0s5-1 7 0v12c-2-1-5-2-7 0s-5-1-7 0V4z" /></svg
					>
				{:else}
					{crumbLabel}
				{/if}
			</a>
		{:else}
			<span class="crumb crumb-current">
				{#if isHome}
					<svg class="home-icon" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"
						><path d="M3 4c2-1 5-2 7 0s5-1 7 0v12c-2-1-5-2-7 0s-5-1-7 0V4z" /></svg
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
