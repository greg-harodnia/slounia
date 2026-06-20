<script lang="ts">
	import { onMount } from 'svelte';
	import ContactModal from '$lib/components/ContactModal.svelte';
	import AddEntity from '$lib/components/AddEntity.svelte';
	import EditWord from '$lib/components/EditWord.svelte';
	import TranslationForm from '$lib/components/TranslationForm.svelte';
	import TranslationDisplay from '$lib/components/TranslationDisplay.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import type { WordData, TagData } from '$lib/types';
	import { PAGE_SIZE, SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '$lib/constants';
	import { highlightText } from '$lib/highlight';
	import { latToCyr, propagateSoftness } from '$lib/lacinka';
	import { getCachedWord } from '$lib/fetch-word';
	import { fetchBlogList } from '$lib/fetch-blog';
	import { likes } from '$lib/stores/likes.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { replaceState } from '$app/navigation';
	import BlogOverlay from '$lib/components/BlogOverlay.svelte';
	import WordOverlay from '$lib/components/WordOverlay.svelte';
	import PinButton from '$lib/components/PinButton.svelte';

	let { data } = $props();

	/* svelte-ignore state_referenced_locally */
	let words = $state<WordData[]>(data.words);
	/* svelte-ignore state_referenced_locally */
	let pinnedWords = $state<WordData[]>(data.pinnedWords);
	/* svelte-ignore state_referenced_locally */
	let tags = $state<TagData[]>(data.tags);
	/* svelte-ignore state_referenced_locally */
	let total = $state(data.total);
	/* svelte-ignore state_referenced_locally */
	let search = $state(data.search);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	/* svelte-ignore state_referenced_locally */
	let sort = $state(data.sort);
	/* svelte-ignore state_referenced_locally */
	let order = $state(data.order);
	/* svelte-ignore state_referenced_locally */
	let selectedTags = $state<string[]>(data.selectedTags);
	let loading = $state(false);
	/* svelte-ignore state_referenced_locally */
	let triggerIndex = $state(data.triggerIndex);

	let devMode = $state(false);
	let draggedTransId = $state<number | null>(null);
	let copiedSearch = $state(false);
	let showWelcome = $state(false);
	let appEl: HTMLDivElement | undefined = $state();
	let showScrollTop = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();
	let showFavorites = $state(false);
	let showComments = $state(true);

	let overlay = $state<string | null>(null);
	type OverlayProps = { slug?: string; wordId?: string; word?: WordData } | null;
	let overlayProps = $state<OverlayProps>(null);
	let overlayDepth = $state(0);

	function preloadBlogList() {
		fetchBlogList();
	}

	function openBlog() {
		overlay = 'blog';
		overlayProps = null;
		overlayDepth++;
		history.pushState({ overlay: 'blog' }, '', '/blog');
	}

	function openWord(wordId: string, wordData?: WordData) {
		overlay = 'word';
		overlayProps = { wordId, word: wordData ?? getCachedWord(wordId) };
		overlayDepth++;
		history.pushState({ overlay: 'word', wordId }, '', `/word/${encodeURIComponent(wordId)}`);
	}

	function openBlogPost(slug: string) {
		overlay = 'post';
		overlayProps = { slug };
		overlayDepth++;
		history.pushState({ overlay: 'post', slug }, '', `/blog/${slug}`);
	}

	function handlePopstate(e: PopStateEvent) {
		if (e.state?.overlay === 'blog') {
			overlay = 'blog';
			overlayProps = null;
			overlayDepth = 1;
		} else if (e.state?.overlay === 'post' && typeof e.state.slug === 'string') {
			overlay = 'post';
			overlayProps = { slug: e.state.slug };
			overlayDepth = 2;
		} else if (e.state?.overlay === 'word' && typeof e.state.wordId === 'string') {
			overlay = 'word';
			overlayProps = { wordId: e.state.wordId };
			overlayDepth = 1;
		} else {
			overlay = null;
			overlayProps = null;
			overlayDepth = 0;
		}
	}

	function loadSettings() {
		try {
			devMode = localStorage.getItem('dev_mode') === 'true';
			showComments = localStorage.getItem('show_comments') !== 'false';
			theme.load();
			settings.load();
		} catch (e) {
			console.error(e);
		}
	}

	function toggleDevMode() {
		devMode = !devMode;
		localStorage.setItem('dev_mode', String(devMode));
	}

	function highlightQuery(q: string): string {
		const cyr = latToCyr(q);
		return propagateSoftness(cyr);
	}

	function toggleComments() {
		showComments = !showComments;
		localStorage.setItem('show_comments', String(showComments));
	}

	function toggleShowFavorites() {
		showFavorites = !showFavorites;
		doSearch();
	}

	async function togglePin(word: WordData) {
		if (!devMode) return;
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(word.id)}/pin`, { method: 'PUT' });
			if (res.ok) {
				const result = await res.json();
				word.is_pinned = result.is_pinned;
				if (result.is_pinned) {
					pinnedWords = [word, ...pinnedWords];
				} else {
					pinnedWords = pinnedWords.filter((w) => w.id !== word.id);
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function toggleHiddenFlag(wordId: string, hidden: boolean) {
		try {
			await fetch(`/api/words/${encodeURIComponent(wordId)}/edit`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ hidden }),
			});
			const word = words.find((w) => w.id === wordId);
			if (word) word.hidden = hidden;
		} catch (e) {
			console.error(e);
		}
	}

	async function fetchPage(offset: number) {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (sort) params.set('sort', sort);
		if (order) params.set('order', order);
		if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
		if (showFavorites) {
			const ids = Object.keys(likes.words).filter((id) => likes.words[id]);
			if (ids.length === 0) {
				return { words: [], total: 0 };
			}
			for (const id of ids) {
				params.append('ids', id);
			}
		}
		if (devMode) params.set('include_hidden', 'true');
		if (
			offset === 0 &&
			!search &&
			!showFavorites &&
			selectedTags.length === tags.length &&
			sort === (import.meta.env.PROD ? 'word' : 'created_at') &&
			order === (import.meta.env.PROD ? 'asc' : 'desc')
		) {
			params.set('include_pinned', 'true');
		}
		params.set('offset', String(offset));
		params.set('limit', String(PAGE_SIZE));
		const res = await fetch(`/api/words?${params}`);
		return res.ok ? await res.json() : null;
	}

	async function fetchWords() {
		try {
			const data = await fetchPage(0);
			if (!data) {
				console.error('API error');
				words = [];
				total = 0;
				return;
			}
			words = data.words;
			total = data.total;
			pinnedWords = data.pinnedWords ?? [];
		} catch (e) {
			console.error(e);
			words = [];
			total = 0;
			return;
		} finally {
			loading = false;
		}

		if (words.length < total) {
			triggerIndex = -1;
			prefetchNext();
		} else {
			updateTrigger();
		}
	}

	let prefetching = $state(false);

	async function prefetchNext() {
		if (prefetching) return;
		const offset = words.length;
		if (offset <= 0 || offset >= total) return;
		prefetching = true;
		try {
			const data = await fetchPage(offset);
			if (data && data.words.length > 0 && words.length === offset) {
				words = [...words, ...data.words];
			}
		} catch (e) {
			console.error(e);
		}
		prefetching = false;
		updateTrigger();
	}

	function updateTrigger() {
		if (words.length < total) {
			triggerIndex = words.length - PAGE_SIZE;
		} else {
			triggerIndex = -1;
		}
	}

	function resetFilters() {
		search = '';
		sort = import.meta.env.PROD ? 'word' : 'created_at';
		order = import.meta.env.PROD ? 'asc' : 'desc';
		selectedTags = tags.map((t) => t.name);
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		replaceState(window.location.pathname, {});
		showFavorites = false;
		doSearch();
	}

	function clearSearch() {
		if (!search) return;
		search = '';
		searchInput?.blur();
		doSearch();
	}

	function doSearch() {
		loading = true;
		words = [];
		total = 0;
		fetchWords();
	}

	function handleSort(field: string) {
		if (sort === field) {
			order = order === 'asc' ? 'desc' : 'asc';
		} else {
			sort = field;
			order = field === 'word' ? 'asc' : 'desc';
		}
		words = [];
		total = 0;
		loading = true;
		fetchWords();
	}

	function handleTagFilter(tagName: string) {
		if (selectedTags.includes(tagName)) {
			selectedTags = selectedTags.filter((t) => t !== tagName);
		} else {
			selectedTags = [...selectedTags, tagName];
		}
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(doSearch, 700);
	}

	function getSortIcon(field: string) {
		if (sort !== field) return '↕';
		return order === 'asc' ? '↑' : '↓';
	}

	$effect(() => {
		if (triggerIndex < 0) return;
		const el = document.querySelector<HTMLElement>('[data-trigger]');
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					observer.disconnect();
					prefetchNext();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	function onToggleWordLike(wordId: string) {
		const word = words.find((w) => w.id === wordId);
		if (word) likes.toggleWord(wordId, word);
	}

	async function deleteWord(wordId: string) {
		if (!confirm(`Выдаліць слова "${wordId}"?`)) return;
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(wordId)}/delete`, {
				method: 'DELETE',
			});
			if (res.ok) {
				words = words.filter((w) => w.id !== wordId);
				total -= 1;
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function reorderTranslations(wordId: string, transIds: number[]) {
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(wordId)}/reorder-translations`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ translation_ids: transIds }),
			});
			if (!res.ok) console.error('Reorder failed', res.status, await res.text());
		} catch (e) {
			console.error(e);
		}
	}

	function handleDragStart(e: DragEvent, transId: number) {
		draggedTransId = transId;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(e: DragEvent, wordId: string, targetId: number) {
		e.preventDefault();
		if (draggedTransId === null || draggedTransId === targetId) return;

		const word = words.find((w) => w.id === wordId);
		if (!word) return;

		const fromIdx = word.translations.findIndex((t) => t.id === draggedTransId);
		const toIdx = word.translations.findIndex((t) => t.id === targetId);
		if (fromIdx === -1 || toIdx === -1) return;

		const copy = [...word.translations];
		const [moved] = copy.splice(fromIdx, 1);
		copy.splice(toIdx, 0, moved);
		word.translations = copy;

		draggedTransId = null;
		reorderTranslations(
			wordId,
			copy.map((t) => t.id),
		);
	}

	async function deleteTranslation(translationId: number) {
		if (!confirm('Выдаліць гэты пераклад?')) return;
		try {
			const res = await fetch(`/api/translations/${translationId}/delete`, {
				method: 'DELETE',
			});
			if (res.ok) {
				for (const word of words) {
					const idx = word.translations.findIndex((t) => t.id === translationId);
					if (idx !== -1) {
						word.translations.splice(idx, 1);
						break;
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	function onToggleTranslationLike(translationId: number) {
		for (const word of words) {
			const tr = word.translations.find((t) => t.id === translationId);
			if (tr) {
				likes.toggleTranslation(translationId, tr);
				break;
			}
		}
	}

	function exportData() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (selectedTags.length) params.set('tags', selectedTags.join(','));

		const a = document.createElement('a');
		a.href = `/api/words/export?${params}`;
		a.download = SITE_NAME + '.csv';
		a.click();
	}

	function copySearchLink() {
		const params = new SvelteURLSearchParams();
		if (search) params.set('search', search);
		if (sort) params.set('sort', sort);
		if (order) params.set('order', order);
		if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
		const url = `${window.location.origin}/?${params}`;
		navigator.clipboard.writeText(url);
		copiedSearch = true;
		setTimeout(() => (copiedSearch = false), 1500);
	}

	$effect(() => {
		const el = appEl;
		if (!el) return;
		const controls = el.querySelector<HTMLElement>('.controls');
		if (!controls) return;

		let translate = 0;
		let lastScrollY = 0;

		const onScroll = () => {
			const st = el.scrollTop;
			const delta = lastScrollY - st;
			lastScrollY = st;
			const h = controls.getBoundingClientRect().height;

			if (st <= h) {
				translate = 0;
			} else if (delta < 0) {
				translate = Math.max(-h, translate + delta);
			} else if (delta > 0 && translate < 0) {
				translate = Math.min(0, translate + delta);
			}

			controls.style.transform = `translateY(${translate}px)`;
			showScrollTop = st > h && translate === 0;
		};

		window.addEventListener('scroll', onScroll, { passive: true, capture: true });
		return () => window.removeEventListener('scroll', onScroll, { capture: true });
	});

	onMount(() => {
		loadSettings();
		likes.load();
		theme.listen();
		if (!data._fromCache) {
			const params = new SvelteURLSearchParams(window.location.search);
			const searchParam = params.get('search');
			if (searchParam) search = searchParam;
			const sortParam = params.get('sort');
			if (sortParam) sort = sortParam;
			const orderParam = params.get('order');
			if (orderParam) order = orderParam;
			const tagsParam = params.get('tags');
			if (tagsParam) {
				selectedTags = tagsParam.split(',');
			} else if (tags.length > 0) {
				selectedTags = tags.map((t) => t.name);
			}
			prefetchNext();
		}
		if (!localStorage.getItem('welcome_dismissed')) showWelcome = true;
		window.addEventListener('popstate', handlePopstate);
		return () => {
			window.removeEventListener('popstate', handlePopstate);
			theme.destroy();
		};
	});

	const faqLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'Што ёсьць наркамаўка?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Наркамаўка гэта афіцыйная беларуская артаґрафія, уведзеная ў 1933 годзе пастановай Наркама асьветы. Ейнае напісаньне набліжанае да расейскага, яна не пазначае мяккасьць зычных, а таксама ня мае выбухное літары Ґ. Часта асацыюецца з расеіфікаванай лексыкай і моўнымі калькамі.',
				},
			},
			{
				'@type': 'Question',
				name: 'Што ёсьць тарашкевіца?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Тарашкевіца (БКП — беларускі клясычны правапіс) гэта традыцыйная беларуская артаґрафія, закладзеная на правілах Браніслава Тарашкевіча (1918). Лепей, ніж афіцыйны правапіс, выражае вымову слоў, пазначае мяккасьць зычных і мае выбухную літару Ґ. Часта асацыюцца з захаваньнем лексычнае чысьціні беларускае мовы й уніканьнем моўных калек.',
				},
			},
		],
	});

	const faqLdHtml = '<script type="application/ld+json">' + faqLd + '</' + 'script>';
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
			e.preventDefault();
			searchInput?.focus();
			searchInput?.select();
		}
	}}
/>

<svelte:head>
	<title>{SITE_NAME}</title>
	<meta property="og:title" content={SITE_NAME} />
	<meta property="og:description" content={SITE_DESCRIPTION} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={SITE_URL} />
	{@html faqLdHtml}
</svelte:head>

<div class="app" bind:this={appEl}>
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
			<h1><button class="heading-btn" onclick={resetFilters}>{SITE_NAME}</button></h1>
		</div>
		<span class="header-right">
			<button class="header-btn btn-icon blog-btn" onclick={openBlog} onmouseenter={preloadBlogList}>
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
				class="header-btn btn-icon"
				class:active={showFavorites}
				onclick={toggleShowFavorites}
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
			<button class="header-btn btn-icon" onclick={toggleComments} aria-label="Toggle comments">
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
			<button
				class="header-btn btn-icon"
				onclick={() => settings.toggleLatin()}
				aria-label="Перамыкач паміж лацінкай і кірыліцай"
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
			<button class="header-btn btn-icon theme-toggle" onclick={() => theme.toggle()} aria-label="Зьмяніць тэму">
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

	{#if !import.meta.env.PROD}
		<div class="dev">
			<AddEntity onWordAdded={() => fetchWords()} />
			<button class="header-btn" onclick={toggleDevMode} aria-label="Toggle developer mode">
				{devMode ? 'Dev ON' : 'Dev OFF'}
			</button>
			<button class="header-btn" onclick={exportData} aria-label="Export CSV"> Сьцягнуць </button>
		</div>
	{/if}

	<div class="controls">
		<div class="search-box">
			<div class="search-input-wrap">
				<div class="search-input-inner">
					<input
						type="text"
						placeholder="Пошук у словах (г=ґ, у=ў, и=і, е=ё)"
						bind:this={searchInput}
						bind:value={search}
						oninput={() => {
							clearTimeout(debounceTimer);
							debounceTimer = setTimeout(doSearch, 300);
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') doSearch();
							else if (e.key === 'Escape') clearSearch();
						}}
					/>
					{#if search}
						<button class="search-clear" onclick={clearSearch} aria-label="Clear search">×</button>
					{/if}
				</div>
				<span class="word-counter">{total}</span>
			</div>
			<button
				class="copy-search-btn"
				onclick={copySearchLink}
				aria-label="Copy link to current search"
				title="Скапіяваць спасылку на гэты вынік"
				><svg
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
				</svg>
			</button>
		</div>

		<div class="tags-row" role="group" aria-label="Фільтр водле тэґаў">
			{#each tags as tag (tag.name)}
				<button
					class="tag-chip"
					class:active={selectedTags.includes(tag.name)}
					onclick={() => handleTagFilter(tag.name)}
					aria-pressed={selectedTags.includes(tag.name)}
				>
					{tag.name}
				</button>
			{/each}
		</div>

		<div class="grid-header">
			<div class="col-word">
				<button class="sort-btn" class:active={sort === 'word'} onclick={() => handleSort('word')}>
					Слова {getSortIcon('word')}
				</button>
				<button class="sort-btn" class:active={sort === 'importance'} onclick={() => handleSort('importance')}>
					⚑ {getSortIcon('importance')}
				</button>
			</div>
			<div class="col-trans">Пераклад</div>
			<div class="col-likes">
				<button class="sort-btn" class:active={sort === 'likes'} onclick={() => handleSort('likes')}>
					❤️ {getSortIcon('likes')}
				</button>
			</div>
		</div>
	</div>

	<div class="table-wrap">
		{#if loading && words.length === 0}
			<div class="loading">Ладаваньне...</div>
		{:else if !loading && words.length === 0}
			<div class="empty">{showFavorites ? 'Няма ўпадабаньняў' : 'Словы ня знойдзеныя'}</div>
		{:else}
			{#if pinnedWords.length > 0}
				<div class="grid-table grid-table--pinned" role="table">
					<div role="row" class="sr-only">
						<div role="columnheader">Слова тыдня</div>
						<div role="columnheader">Пераклад</div>
						<div role="columnheader">Лайкі</div>
					</div>
					{#each pinnedWords as word (word.id)}
						<div class="grid-row grid-row--pinned" role="row">
							<span class="pinned-badge">
								<svg
									viewBox="0 0 24 24"
									width="12"
									height="12"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="1"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
									/>
								</svg>
								Слова тыдня
							</span>
							<div class="col-word" role="cell">
								<button
									class="icon-btn"
									onclick={() => openWord(word.id, word)}
									aria-label="Open word details"
									><svg
										viewBox="0 0 24 24"
										width="14"
										height="14"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline
											points="15 3 21 3 21 9"
										/><line x1="10" y1="14" x2="21" y2="3" /></svg
									></button
								>
								<Tooltip content={showComments ? word.comment : null}>
									<span class="word-text" class:has-note={showComments && word.comment !== null}
										>{@html highlightText(word.id, highlightQuery(search))}</span
									>
								</Tooltip>
								{#if devMode}
									<PinButton pinned={word.is_pinned} onclick={() => togglePin(word)} />
								{/if}
								<div class="meta-row">
									{#if word.importance.name}
										<ImportanceBadge name={word.importance.name} level={word.importance.level} />
									{/if}
									<TagList tags={word.tags} />
								</div>
							</div>
							<div class="col-trans" role="cell">
								{#each word.translations as tr, j (j)}
									<div class="translation-item">
										<TranslationDisplay
											translation={tr.translation}
											comment={tr.comment}
											showLatin={settings.showLatin}
											{showComments}
											searchQuery={search}
											onWordLink={openWord}
										/>
										<LikeButton
											liked={!!likes.translations[tr.id]}
											count={tr.likes}
											onclick={() => onToggleTranslationLike(tr.id)}
											label="Like translation"
											small
										/>
									</div>
								{/each}
								{#if word.translations.length === 0}
									<span class="muted">Не перакладзена</span>
								{/if}
							</div>
							<div class="col-likes" role="cell">
								<LikeButton
									liked={!!likes.words[word.id]}
									count={word.likes}
									onclick={() => onToggleWordLike(word.id)}
									label="Like word"
								/>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<div class="grid-table" role="table">
				<div role="row" class="sr-only">
					<div role="columnheader">Слова</div>
					<div role="columnheader">Пераклад</div>
					<div role="columnheader">Лайкі</div>
				</div>
				{#each words as word, i (word.id)}
					<div class="grid-row" role="row" data-trigger={i === triggerIndex ? '' : undefined}>
						<div class="col-word" role="cell">
							<button
								class="icon-btn"
								onclick={() => openWord(word.id, word)}
								aria-label="Open word details"
								><svg
									viewBox="0 0 24 24"
									width="14"
									height="14"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline
										points="15 3 21 3 21 9"
									/><line x1="10" y1="14" x2="21" y2="3" /></svg
								></button
							>
							<Tooltip content={showComments ? word.comment : null}>
								<span class="word-text" class:has-note={showComments && word.comment !== null}
									>{@html highlightText(word.id, highlightQuery(search))}</span
								>
							</Tooltip>
							{#if devMode}
								<button
									class="icon-btn"
									class:warning={word.hidden}
									onclick={() => toggleHiddenFlag(word.id, !word.hidden)}
									aria-label={word.hidden
										? 'Паказаць слова карыстальнікам'
										: 'Схаваць слова ад карыстальнікаў'}
								>
									<svg
										viewBox="0 0 24 24"
										width="14"
										height="14"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										{#if word.hidden}
											<path
												d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
											/>
											<path
												d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
											/>
											<line x1="1" y1="1" x2="23" y2="23" />
										{:else}
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
											<circle cx="12" cy="12" r="3" />
										{/if}
									</svg>
								</button>
								<EditWord {word} onWordEdited={() => fetchWords()} />
								{#if devMode}
									<PinButton pinned={word.is_pinned} onclick={() => togglePin(word)} />
								{/if}
								<button
									class="delete-btn-sm"
									onclick={() => deleteWord(word.id)}
									aria-label="Delete word">×</button
								>
							{/if}
							<div class="meta-row">
								{#if word.importance.name}
									<ImportanceBadge name={word.importance.name} level={word.importance.level} />
								{/if}
								<TagList tags={word.tags} />
							</div>
						</div>
						<div class="col-trans" role="cell">
							{#each word.translations as tr, j (j)}
								<div
									class="translation-item"
									class:dragging={devMode && draggedTransId === tr.id}
									class:draggable-hover={devMode &&
										draggedTransId !== null &&
										draggedTransId !== tr.id}
									{...devMode
										? {
												ondragover: handleDragOver,
												ondrop: (e: DragEvent) => handleDrop(e, word.id, tr.id),
											}
										: {}}
								>
									{#if devMode}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<span
											class="drag-handle"
											draggable="true"
											ondragstart={(e: DragEvent) => handleDragStart(e, tr.id)}>⠿</span
										>
									{/if}
									<TranslationDisplay
										translation={tr.translation}
										comment={tr.comment}
										showLatin={settings.showLatin}
										{showComments}
										searchQuery={search}
										onWordLink={openWord}
									/>
									<LikeButton
										liked={!!likes.translations[tr.id]}
										count={tr.likes}
										onclick={() => onToggleTranslationLike(tr.id)}
										label="Like translation"
										small
									/>
									{#if devMode}
										<TranslationForm translation={tr} onDone={() => fetchWords()} />
										<button
											class="delete-btn-sm"
											onclick={() => deleteTranslation(tr.id)}
											aria-label="Delete translation">×</button
										>
									{/if}
								</div>
							{/each}
							{#if word.translations.length === 0}
								<span class="muted">Не перакладзена</span>
							{/if}
							{#if devMode}
								<TranslationForm wordId={word.id} onDone={() => fetchWords()} />
							{/if}
						</div>
						<div class="col-likes" role="cell">
							<LikeButton
								liked={!!likes.words[word.id]}
								count={word.likes}
								onclick={() => onToggleWordLike(word.id)}
								label="Like word"
							/>
						</div>
					</div>
				{/each}
			</div>
			<div class="table-footer">
				{#if prefetching}
					<div class="footer-loading">Ладаваньне...</div>
				{:else}
					<ContactModal userToken={likes.userToken} {devMode} />
				{/if}
			</div>
		{/if}
	</div>
	{#if copiedSearch}
		<div class="copy-toast">Спасылка скапіяваная</div>
	{/if}
	{#if showScrollTop}
		<button
			class="scroll-top"
			onclick={() => appEl?.scrollTo({ top: 0, behavior: 'smooth' })}
			aria-label="Scroll to top"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M18 15l-6-6-6 6" /></svg
			>
		</button>
	{/if}
</div>

<Modal
	title="Вітаем"
	open={showWelcome}
	onclose={() => {
		showWelcome = false;
		localStorage.setItem('welcome_dismissed', '1');
	}}
	closeOnOverlay
>
	<p>
		Нам вельмі важна, каб гэты праект зыскаў (састарэлае слоўца для калярыту) як мага болей увагі й распаўсюду, таму
		будзем удзячныя, калі вы спрычыніцеся да гэтае справы разам з намі й падзеліцеся спасылкай з кім можаце 🙂
		Таксама вельмі дапамогуць публічныя спасылкі, будзь тое ў X, Instagram, VK ці дзе яшчэ. Калі вы маеце заўвагі ці
		прапановы, можаце адсылаць іх праз форму "Напісаць творцу". Шчыра дзякуем!<br /><br />
		Спасылка для капіяваньня:
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={SITE_URL + '/?ref=voluntary'}
			onclick={(e) => {
				e.preventDefault();
				navigator.clipboard.writeText(`${SITE_URL}/?ref=voluntary`);
				copiedSearch = true;
				setTimeout(() => (copiedSearch = false), 1500);
			}}>{SITE_URL}/?ref=voluntary</a
		>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</p>
</Modal>

{#if overlay === 'blog' || overlay === 'post'}
	<BlogOverlay onOpenPost={openBlogPost} initialSlug={overlayProps?.slug} />
{/if}

{#if overlay === 'word'}
	<WordOverlay
		initialWordId={overlayProps?.wordId}
		initialWord={overlayProps?.word}
		onWordLink={openWord}
		{overlayDepth}
	/>
{/if}

<style>
	.app {
		max-width: 1100px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	.dev {
		display: flex;
		margin-bottom: 2rem;
	}

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

	.header-right,
	.search-box {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	.header-btn {
		padding: 0.5rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
		letter-spacing: 0.03em;
		line-height: 1;
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
	}
	@media (hover: hover) {
		.header-btn:hover {
			border-color: var(--c-primary);
			color: var(--c-primary);
		}
	}

	.controls {
		/* margin-bottom: 1rem; */
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex-shrink: 0;
		position: relative;
		z-index: 2;
	}

	.search-input-wrap {
		flex: 1;
		display: flex;
		position: relative;
	}

	.search-input-inner {
		flex: 1;
		display: flex;
		position: relative;
		z-index: 2;
	}

	.search-input-inner input {
		min-width: 0;
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		background: none;
		border: none;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
		color: var(--c-text-muted);
		padding: 0.15rem 0.3rem;
		border-radius: 4px;
		font-family: inherit;
		transition: color 0.1s;
	}

	@media (hover: hover) {
		.search-clear:hover {
			color: var(--c-text);
		}
	}

	.search-box input {
		flex: 1;
		min-width: 0;
		padding: 0.625rem 1rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
		background: var(--c-surface);
		color: var(--c-text);
		position: relative;
		z-index: 1;
	}

	.search-box input:focus {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 3px rgba(91, 106, 191, 0.1);
	}

	.word-counter {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		padding: 0.625rem 0;
		margin-left: -1.5px;
		border: 1.5px solid var(--c-border);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.tags-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.tag-chip {
		padding: 0.3rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: 999px;
		background: var(--c-surface);
		color: var(--c-tag-text);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	@media (hover: hover) {
		.tag-chip:hover {
			border-color: var(--c-primary);
			color: var(--c-primary);
		}
	}

	.tag-chip.active {
		background: var(--c-tag-active);
		border-color: var(--c-tag-active);
		color: var(--c-tag-active-text);
	}

	.table-wrap {
		flex: 1;
		min-height: 0;
		background: var(--c-surface);
		box-shadow: var(--shadow-md);
		overflow-y: auto;
	}

	.grid-header,
	.grid-row {
		display: grid;
		grid-template-columns: 33% 1fr 10%;
	}

	.grid-header {
		position: sticky;
		top: var(--thead-top, 0);
		z-index: 1;
	}

	.grid-header > * {
		background: var(--c-surface);
		padding: 0.75rem 1rem;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		border-bottom: 2px solid var(--c-border);
		text-align: left;
		white-space: nowrap;
	}

	.grid-header > *:first-child {
		border-radius: var(--radius) 0 0 0;
	}

	.grid-header > *:last-child {
		border-radius: 0 var(--radius) 0 0;
	}

	.sort-btn {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		padding: 0;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	@media (hover: hover) {
		.sort-btn:hover {
			color: var(--c-primary);
		}
	}

	.grid-row {
		border-bottom: 1px solid var(--c-border);
		transition: background 0.1s;
	}

	.grid-row:last-child {
		border-bottom: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.grid-row:hover {
			background: var(--c-surface-hover);
		}
	}

	.grid-row > * {
		padding: 0.875rem 1rem;
		overflow-wrap: break-word;
	}

	.word-text {
		font-size: 1.1rem;
		font-weight: 600;
		display: inline;
		line-height: 1.5rem;
	}

	.col-word .icon-btn {
		float: right;
	}

	@media (width > 640px) {
		.grid-header .col-word {
			display: flex;
			gap: 1rem;
			align-items: center;
		}
	}

	.meta-row {
		padding-top: 0.5rem;
	}

	.translation-item {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 0.35rem;
		padding: 0.3rem 0;
		transition:
			background 0.1s,
			opacity 0.1s;
	}
	.translation-item.dragging {
		opacity: 0.4;
	}
	.translation-item.draggable-hover {
		background: var(--c-primary-light);
		border-radius: 4px;
	}

	.drag-handle {
		cursor: grab;
		color: var(--c-text-muted);
		font-size: 0.85rem;
		user-select: none;
		line-height: 1;
		padding: 0 0.15rem;
	}
	.drag-handle:active {
		cursor: grabbing;
	}
	@media (hover: hover) {
		.drag-handle:hover {
			color: var(--c-primary);
		}
	}

	.translation-item + .translation-item {
		border-top: 1px solid var(--c-border);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.copy-toast {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		background: var(--c-text);
		color: var(--c-bg);
		padding: 0.5rem 1.25rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 500;
		pointer-events: none;
		box-shadow: var(--shadow-md);
		animation: fade-in-out 1.5s ease-in-out;
	}

	@media (width <= 640px) {
		.copy-toast {
			display: none;
		}
	}

	@keyframes fade-in-out {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(0.5rem);
		}
		15% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		85% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateX(-50%) translateY(-0.5rem);
		}
	}

	.delete-btn-sm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--c-text-muted);
		font-size: 1rem;
		cursor: pointer;
		font-family: inherit;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	@media (hover: hover) {
		.delete-btn-sm:hover {
			background: var(--c-like-light);
			color: var(--c-like);
		}
	}

	.header-btn.active {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-left: 0.5rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--c-text);
		font-size: 0.8rem;
		cursor: pointer;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
		opacity: 0.4;
		vertical-align: middle;
	}
	@media (hover: hover) {
		.icon-btn:hover {
			opacity: 1;
			background: var(--c-primary-light);
		}
	}

	.icon-btn.warning {
		color: var(--c-like);
		opacity: 1;
	}
	@media (hover: hover) {
		.icon-btn.warning:hover {
			background: var(--c-like-light);
		}
	}

	.copy-search-btn {
		height: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 1rem;
		cursor: pointer;
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
		font-family: inherit;
	}
	@media (hover: hover) {
		.copy-search-btn:hover {
			border-color: var(--c-primary);
			background: var(--c-primary-light);
		}
	}

	.table-footer {
		padding: 0.75rem 1rem;
		font-size: 0.8rem;
		color: var(--c-text-muted);
		border-top: 1px solid var(--c-border);
		background: var(--c-surface);
		flex-shrink: 0;
	}

	.footer-loading {
		text-align: center;
		padding: 0.25rem 0;
	}

	.loading,
	.empty {
		padding: 3rem 1rem;
		text-align: center;
		color: var(--c-text-muted);
		font-size: 0.95rem;
	}

	@media (width <= 1024px) {
		.app {
			overflow-y: auto;
		}

		.controls {
			position: sticky;
			top: 0;
			z-index: 2;
			background: var(--c-bg);
			padding: 0.75rem 0 0;
			/* margin-bottom: 0; */
		}

		.table-wrap {
			flex: none;
		}

		.grid-header,
		.grid-row {
			grid-template-columns: 33% 1fr 14%;
		}
	}

	@media (width <= 640px) {
		.app {
			padding: 0 0.75rem;
			padding-bottom: env(safe-area-inset-bottom, 0.75rem);
		}

		.header {
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.5rem;
			padding-top: 1rem;
		}

		.header-left {
			flex-direction: column;
			align-items: center;
			gap: 0;
		}

		h1 {
			text-align: center;
		}

		.heading-btn {
			font-size: 1.25rem;
		}

		.header-right,
		.search-box {
			gap: 0.5rem;
		}

		.header-btn {
			padding: 0.4rem 0.5rem;
			font-size: 0.7rem;
		}

		.search-box input {
			font-size: 0.85rem;
			padding: 0.5rem 0.75rem;
		}

		.word-counter {
			padding: 0.5rem 0;
		}

		.tag-chip {
			padding: 0.2rem 0.5rem;
		}

		.table-wrap {
			background: transparent;
			box-shadow: none;
		}

		.controls {
			padding-bottom: 0.75rem;
			gap: 0.75rem;
		}

		.tags-row {
			justify-content: space-evenly;
		}

		.grid-header {
			display: flex;
			justify-content: space-evenly;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.35rem;
			/* padding-top: 0.5rem; */
			position: static;
			z-index: auto;
		}

		.grid-header > * {
			padding: 0;
			border: none;
			background: none;
			white-space: nowrap;
			width: auto;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--c-text-muted);
		}

		.grid-header > .col-word {
			display: contents;
		}

		.grid-header > .col-trans {
			display: none;
		}

		.grid-header .sort-btn {
			padding: 0.2rem 0.65rem;
			border: 1.5px solid var(--c-border);
			border-radius: 999px;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			background: transparent;
			color: var(--c-text-muted);
			cursor: pointer;
			transition: all 0.15s;
			font-family: inherit;
		}

		.grid-header .sort-btn.active {
			border-color: var(--c-primary);
			color: var(--c-primary);
			background: var(--c-primary-light);
		}

		.grid-row,
		.table-footer {
			border: 1px solid var(--c-border);
			border-radius: var(--radius);
		}

		.grid-row {
			grid-template-columns: auto 1fr;
			gap: 0.5rem;
			margin-bottom: 0.75rem;
			padding: 0.75rem;
			background: var(--c-surface);
			box-shadow: var(--shadow);
		}

		.grid-row:last-child {
			margin-bottom: 0;
		}

		.grid-row > * {
			padding: 0;
		}

		.col-word {
			grid-column: 1 / -1;
		}

		.col-trans {
			grid-column: 1 / -1;
		}

		.col-likes {
			grid-column: 1 / -1;
			justify-self: end;
		}

		.translation-item {
			padding: 0.25rem 0;
		}

		.table-footer {
			margin-top: 0.75rem;
		}
	}

	.scroll-top {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: var(--c-primary);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-md);
		z-index: 100;
		transition:
			opacity 0.2s,
			transform 0.2s;
		appearance: none;
		-webkit-tap-highlight-color: transparent;
	}

	.scroll-top:hover {
		background: var(--c-primary-hover);
		transform: scale(1.05);
	}

	@media (width <= 640px) {
		.scroll-top {
			bottom: 1rem;
			right: 1rem;
			width: 40px;
			height: 40px;
		}
	}

	.grid-row > .pinned-badge {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: #eab308;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.875rem 0 0 1rem;
	}

	.grid-row--pinned > .col-word,
	.grid-row--pinned > .col-trans {
		padding-top: 0.3rem;
	}

	.grid-table--pinned .grid-row:last-child {
		border-bottom: 1px solid var(--c-border);
	}

	@media (width <= 640px) {
		.grid-row > .pinned-badge {
			padding: 0;
		}

		.grid-row--pinned > .col-word,
		.grid-row--pinned > .col-trans {
			padding-top: 0;
		}

		.grid-table--pinned {
			margin-bottom: 0.75rem;
		}
	}
</style>
