<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';

	const isNotFound = $derived($page.status === 404);
	const title = $derived(isNotFound ? 'Старонка ня знойдзеная' : 'Памылка');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content="Старонка ня знойдзеная." />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="error-page page-wrapper">
	<div class="error-card">
		<h1 class="error-title">{title}</h1>
		{#if isNotFound}
			<p class="error-message">Магчыма, старонка пераназваная або выдаленая.</p>
		{:else}
			<p class="error-message">{$page.error?.message || 'Нешта пайшло не так.'}</p>
		{/if}
		<a class="error-link" href={resolve('/')}>Вярнуцца да галоўнай</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem 1rem;
	}

	.error-card {
		width: 100%;
		max-width: 28rem;
		text-align: center;
		background: var(--c-surface);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow);
		padding: 2rem 1.5rem;
	}

	.error-title {
		margin: 0 0 0.75rem;
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--c-text);
		line-height: 1.3;
	}

	.error-message {
		margin: 0 0 1.5rem;
		color: var(--c-text-muted);
		line-height: 1.6;
	}

	.error-link {
		display: inline-block;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s;
	}

	.error-link:hover {
		background: var(--c-primary-hover);
	}

	.error-link:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 2px;
	}

	@media (max-width: 600px) {
		.error-card {
			padding: 1.5rem 1rem;
		}

		.error-title {
			font-size: 1.25rem;
		}
	}
</style>
