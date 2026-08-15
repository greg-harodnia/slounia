<script lang="ts">
	import { SITE_NAME } from '$lib/constants';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';

	interface Props {
		showFavorites: boolean;
		showComments: boolean;
		onReset: () => void;
		onOpenBlog: () => void;
		onPreloadBlog: () => void;
		onOpenSuggest: () => void;
		onPreloadSuggest: () => void;
		onToggleFavorites: () => void;
		onToggleComments: () => void;
		onToggleLatin: () => void;
		onToggleTheme: () => void;
	}

	let {
		showFavorites,
		showComments,
		onReset,
		onOpenBlog,
		onPreloadBlog,
		onOpenSuggest,
		onPreloadSuggest,
		onToggleFavorites,
		onToggleComments,
		onToggleLatin,
		onToggleTheme,
	}: Props = $props();
</script>

<header class="header">
	<div class="header-left">
		<svg class="app-logo" viewBox="0 0 32 32" aria-label="Logo">
			<rect width="32" height="32" rx="7" fill="var(--logo-bg)" />
			<path
				d="M6 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v19l-5-3.5L16 26l-5-3.5L6 26V7z"
				fill="none"
				stroke="var(--logo-fg)"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
			<text
				x="16"
				y="19"
				font-family="system-ui, sans-serif"
				font-size="12"
				font-weight="700"
				fill="var(--logo-fg)"
				text-anchor="middle">Ў</text
			>
		</svg>
		<h1><button class="heading-btn" onclick={onReset}>{SITE_NAME}</button></h1>
	</div>
	<span class="header-right">
		<button class="header-btn btn-icon blog-btn" onclick={onOpenBlog} onmouseenter={onPreloadBlog}>
			<svg
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 20h9" />
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
			</svg>
			Блёґ
		</button>
		<button
			class="header-btn btn-icon suggest-btn"
			onclick={onOpenSuggest}
			onmouseenter={onPreloadSuggest}
			onfocus={onPreloadSuggest}
			aria-label="Запрапанаваць слова"
		>
			<svg
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>
		<button
			class="header-btn btn-icon"
			class:active={showFavorites}
			onclick={onToggleFavorites}
			aria-label="Show favorites"
		>
			<svg
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill={showFavorites ? 'currentColor' : 'none'}
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path
					d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
				/></svg
			>
		</button>
		<button class="header-btn btn-icon" onclick={onToggleComments} aria-label="Toggle comments">
			<svg
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
				{#if !showComments}
					<line x1="4" y1="4" x2="20" y2="20" />
				{/if}
			</svg>
		</button>
		<button class="header-btn btn-icon" onclick={onToggleLatin} aria-label="Перамыкач паміж лацінкай і кірыліцай">
			<svg
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				{#if settings.showLatin}
					<text
						x="12"
						y="12"
						dominant-baseline="central"
						font-family="system-ui, sans-serif"
						font-size="20"
						font-weight="700"
						fill="currentColor"
						text-anchor="middle"
						stroke="none">Ł</text
					>
				{:else}
					<text
						x="12"
						y="12"
						dominant-baseline="central"
						font-family="system-ui, sans-serif"
						font-size="20"
						font-weight="700"
						fill="currentColor"
						text-anchor="middle"
						stroke="none">Ў</text
					>
				{/if}
			</svg>
		</button>
		<button class="header-btn btn-icon theme-toggle" onclick={onToggleTheme} aria-label="Зьмяніць тэму">
			{#if theme.name === 'dark'}
				<svg
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
					/>
				</svg>
			{:else if theme.name === 'national'}
				<span class="emoji-fix">🏰</span>
			{:else}
				<svg
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
					/>
				</svg>
			{/if}
		</button>
	</span>
</header>

<style>
	.header {
		padding-top: 2rem;
		margin-bottom: 1rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.heading-btn {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--c-text);
		font-family: inherit;
		padding: 0;
		text-align: left;
	}

	.app-logo {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		--logo-bg: #0f172a;
		--logo-fg: #e2e8f0;
	}

	:global([data-theme='dark']) .app-logo {
		--logo-bg: #e2e8f0;
		--logo-fg: #0f172a;
	}

	:global([data-theme='national']) .app-logo {
		--logo-bg: var(--c-primary);
		--logo-fg: var(--c-bg);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	:global(.header-btn) {
		padding: 0.5rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		line-height: 1;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		letter-spacing: 0.03em;
	}

	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.theme-toggle {
		flex-shrink: 0;
	}

	.emoji-fix {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
	}

	.blog-btn {
		text-decoration: none;
		gap: 0.35rem;
		border-color: var(--c-primary);
		/* color: var(--c-primary); */
	}

	@media (hover: hover) {
		:global(.header-btn:hover) {
			border-color: var(--c-primary);
			color: var(--c-primary);
		}
	}

	:global(.header-btn.active) {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}

	@media (width <= 640px) {
		.header {
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.5rem;
			padding-top: 1rem;
		}

		.header-left {
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
		}

		h1 {
			text-align: center;
		}

		.heading-btn {
			font-size: 1.25rem;
		}

		.header-right {
			gap: 0.5rem;
		}

		:global(.header-btn) {
			padding: 0.4rem 0.5rem;
			font-size: 0.7rem;
		}
	}
</style>
