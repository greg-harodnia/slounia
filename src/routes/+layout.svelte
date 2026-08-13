<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { dev } from '$app/environment';
	import { page } from '$app/stores';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import PwaPrompt from '$lib/components/PwaPrompt.svelte';
	import { overlays, preloadChatWidget } from '$lib/preload.svelte';
	import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '$lib/constants';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { userStore } from '$lib/stores/userStore.svelte';
	import { onMount } from 'svelte';

	injectSpeedInsights();
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children, data } = $props();

	let isBanned = $derived(data.banned);
	let banReason = $derived(data.banReason || '');
	let chatRequested = $state(false);

	const svgChat =
		'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

	const ldWebsite = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': ['WebSite', 'Dictionary'],
		name: SITE_NAME,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		inLanguage: ['be', 'be-tarask', 'ru'],
		keywords:
			'Слоуня, Наркамаўска-беларускі слоўнічак, наркамаўка, тарашкевіца, трасянка, калька, антыкалька, антытрасянка, беларуская мова, пераклад, перакладнік, belarusian, слоўнік, слоўнічак, белорусский язык, Іван Насовіч, Байкоў-Некрашэвіч, verbum, slounik, скарнік, skarnik, белазар, belazar, БКП, беларускі клясычны правапіс, лацінка, чыстая мова, моўны пурызм',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: SITE_URL + '/?search={search_term_string}',
			},
			'query-input': 'required name=search_term_string',
		},
	});
	const ldOrganization = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_NAME,
		url: SITE_URL,
	});
	const ldBreadcrumb = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL }],
	});

	const ldWebsiteHtml = '<script type="application/ld+json">' + ldWebsite + '</' + 'script>';
	const ldOrganizationHtml = '<script type="application/ld+json">' + ldOrganization + '</' + 'script>';
	const ldBreadcrumbHtml = '<script type="application/ld+json">' + ldBreadcrumb + '</' + 'script>';

	function getTokenFromStorage(): string {
		try {
			return localStorage.getItem('user_token') || '';
		} catch {
			return '';
		}
	}

	function setTokenCookie(token: string) {
		document.cookie = `user_token=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
	}

	onMount(() => {
		const token = getTokenFromStorage();
		if (token) {
			setTokenCookie(token);
		}
		userStore.load();
	});
</script>

<PwaPrompt />

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href={PUBLIC_SUPABASE_URL} />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="author" content="Слоўня" />
	<title>{SITE_NAME}</title>
	<meta name="description" content={SITE_DESCRIPTION} />

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="be_BY" />
	<meta property="og:image" content="{SITE_URL}/pwa-512x512.png" />
	<meta property="og:image:width" content="512" />
	<meta property="og:image:height" content="512" />
	<meta name="twitter:card" content="summary_large_image" />

	<link rel="canonical" href="{SITE_URL}{$page.url.pathname}" />
	<link rel="alternate" hreflang="be" href="{SITE_URL}{$page.url.pathname}" />
	<link rel="alternate" hreflang="be-tarask" href="{SITE_URL}{$page.url.pathname}" />
	<link rel="alternate" hreflang="x-default" href="{SITE_URL}{$page.url.pathname}" />

	{@html ldWebsiteHtml}
	{@html ldOrganizationHtml}
	{@html ldBreadcrumbHtml}
</svelte:head>

{#if isBanned}
	<div class="ban-overlay">
		<div class="ban-card">
			<h1>Доступ забаранёны</h1>
			<p class="ban-message">{banReason || ''}</p>
		</div>
	</div>
{:else}
	<main>
		{@render children()}
	</main>
	{#if overlays.chat}
		{@const ChatWidgetC = overlays.chat}
		<ChatWidgetC open={chatRequested} />
	{:else}
		<button
			class="chat-fab"
			aria-label="Адкрыць памочніка"
			onmouseenter={preloadChatWidget}
			onfocus={preloadChatWidget}
			ontouchstart={preloadChatWidget}
			onclick={() => {
				chatRequested = true;
				preloadChatWidget();
			}}
		>
			{@html svgChat}
		</button>
	{/if}
{/if}

<style>
	.ban-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--c-bg, #f5f5f5);
	}
	.ban-card {
		max-width: 480px;
		padding: 2rem;
		text-align: center;
	}
	.ban-card h1 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}
	.ban-message {
		font-size: 1rem;
		color: var(--c-text-muted, #666);
		line-height: 1.6;
	}

	.chat-fab {
		position: fixed;
		right: 1rem;
		bottom: 1rem;
		z-index: 95;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--c-primary);
		color: #fff;
		border: none;
		cursor: pointer;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
		transition:
			transform 0.15s,
			opacity 0.15s;
	}

	.chat-fab:hover {
		opacity: 0.9;
		transform: scale(1.05);
	}

	@media (max-width: 480px) {
		.chat-fab {
			right: 0.75rem;
			bottom: 0.75rem;
		}
	}
</style>
