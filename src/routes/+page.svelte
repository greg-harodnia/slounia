<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ContactTrigger from '$lib/components/ContactTrigger.svelte';
	import AddEntity from '$lib/components/AddEntity.svelte';
	import {
		overlays,
		preloadWordOverlay,
		preloadBlogOverlay,
		preloadContactModal,
		preloadEditWord,
		preloadTranslationForm,
		preloadSuggestOverlay,
		preloadWelcomeModal,
	} from '$lib/preload.svelte';
	import TranslationDisplay from '$lib/components/TranslationDisplay.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import ImportanceBadge from '$lib/components/ImportanceBadge.svelte';
	import TagList from '$lib/components/TagList.svelte';
	import type { WordData, TagData } from '$lib/types';
	import { parseCrossref } from '$lib/types';
	import {
		DEFAULT_ORDER,
		DEFAULT_SORT,
		FULL_LIST_LIMIT,
		PAGE_SIZE,
		SCROLL_PREFETCH_MARGIN,
		SITE_NAME,
		SITE_URL,
		SITE_DESCRIPTION,
	} from '$lib/constants';
	import { highlightText } from '$lib/highlight';
	import { latToCyr } from '$lib/lacinka';
	import { getCachedWord, setCachedWord } from '$lib/fetch-word';
	import { queryWords } from '$lib/word-search';
	import { WordFilters } from '$lib/word-filters.svelte';
	import { blogStore } from '$lib/stores/blogStore.svelte';
	import { userStore } from '$lib/stores/userStore.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { replaceState, pushState } from '$app/navigation';
	import PinButton from '$lib/components/PinButton.svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import WordControls from '$lib/components/WordControls.svelte';

	let { data } = $props();

	/* svelte-ignore state_referenced_locally */
	let allWords = $state<WordData[]>(data.words);
	let tags = $state<TagData[]>($page.data.tags ?? []);

	// Initial filter state comes from the URL so a shared link renders
	// filtered without a flash of the full list.
	const initialSearch = $page.url.searchParams.get('search') ?? '';
	const initialSortParam = $page.url.searchParams.get('sort');
	const initialOrderParam = $page.url.searchParams.get('order');
	const initialTagsParam = $page.url.searchParams.get('tags');
	const filters = new WordFilters({
		search: initialSearch,
		sort: initialSortParam ?? (initialSearch ? 'relevance' : DEFAULT_SORT),
		order: initialOrderParam ?? (initialSearch && !initialSortParam ? 'desc' : DEFAULT_ORDER),
		sortExplicit: !!initialSortParam,
		selectedTags: initialTagsParam ? initialTagsParam.split(',') : tags.map((t) => t.name),
		allTagNames: tags.map((t) => t.name),
	});

	// The SSR payload only carries the first page + pinned words; the full
	// dictionary is fetched lazily after first paint. Until it arrives, stay
	// in the loading state whenever the view needs the whole list (an empty
	// SSR payload or an active search/filter).
	let fullListLoaded = $state(false);
	let hasActiveFilter = $derived(
		!!filters.search ||
			filters.showFavorites ||
			filters.selectedTags.length !== tags.length ||
			filters.sort !== DEFAULT_SORT ||
			filters.order !== DEFAULT_ORDER,
	);
	let loading = $derived(!fullListLoaded && (data.words.length === 0 || hasActiveFilter));
	let listError = $state(false);

	let devMode = $state(false);
	let draggedTransId = $state<number | null>(null);
	let copiedSearch = $state(false);
	let exportError = $state<string | null>(null);
	let showWelcome = $state(false);
	let appEl: HTMLDivElement | undefined = $state();
	let tableWrapEl: HTMLDivElement | undefined = $state();
	let showScrollTop = $state(false);
	let searchInput: HTMLInputElement | undefined = $state();
	let showComments = $state(true);

	// Local search/filter/sort over the full dictionary. Everything is derived
	// from allWords + the filter state, so mutating the underlying word objects
	// (pins, hidden flags, deletions) updates the view automatically. In dev
	// builds the SSR load already includes hidden words; they only become
	// visible once the dev_mode admin toggle is on.
	let visiblePool = $derived(devMode ? allWords : allWords.filter((w) => !w.hidden));
	let favoriteIds = $derived(Object.keys(userStore.words).filter((id) => userStore.words[id]));
	let visibleWords = $derived(
		queryWords(visiblePool, {
			search: filters.search,
			sort: filters.sort,
			order: filters.order,
			selectedTags: filters.selectedTags,
			allTags: tags.map((t) => t.name),
			favoriteIds: filters.showFavorites ? favoriteIds : null,
		}),
	);
	let pinnedWords = $derived(visiblePool.filter((w) => w.is_pinned));
	let total = $derived(visibleWords.length);
	let showPinned = $derived(
		!filters.search &&
			!filters.showFavorites &&
			filters.selectedTags.length === tags.length &&
			filters.sort === DEFAULT_SORT &&
			filters.order === DEFAULT_ORDER,
	);

	// Paging: same visual behavior as the old infinite scroll — words appear in
	// pages of PAGE_SIZE as you scroll. But the whole dictionary is already in
	// memory, so "loading" the next page is just a local slice, no refetch.
	let visibleCount = $state(PAGE_SIZE);
	let pagedWords = $derived(visibleWords.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < visibleWords.length);
	let loadMoreEl: HTMLDivElement | undefined = $state();

	let queryVersion = '';
	$effect(() => {
		// Reset to the first page whenever the query changes.
		const version = [
			filters.search,
			filters.sort,
			filters.order,
			filters.selectedTags.join(','),
			filters.showFavorites,
		].join('|');
		if (version !== queryVersion) {
			queryVersion = version;
			visibleCount = PAGE_SIZE;
		}
	});

	$effect(() => {
		const el = loadMoreEl;
		if (!el || !hasMore) return;
		// Pre-render rows before they reach the viewport so momentum scrolling
		// doesn't hit a wall of freshly-inserted DOM mid-fling.
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					visibleCount += PAGE_SIZE;
				}
			},
			{ root: appEl ?? null, rootMargin: `0px 0px ${SCROLL_PREFETCH_MARGIN}px 0px` },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	let overlay = $state<string | null>(null);
	type OverlayProps = { slug?: string; wordId?: string; word?: WordData } | null;
	let overlayProps = $state<OverlayProps>(null);

	function restoreOverlayFromURL() {
		const path = window.location.pathname;
		if (path === '/blog') {
			preloadBlogOverlay();
			overlay = 'blog';
			overlayProps = null;
		} else if (path.startsWith('/blog/')) {
			preloadBlogOverlay();
			overlay = 'post';
			overlayProps = { slug: decodeURIComponent(path.slice('/blog/'.length)) };
		} else if (path.startsWith('/word/')) {
			preloadWordOverlay();
			const wordId = decodeURIComponent(path.slice('/word/'.length));
			overlay = 'word';
			overlayProps = { wordId, word: getCachedWord(wordId) };
		} else if (path === '/suggest') {
			preloadSuggestOverlay();
			overlay = 'suggest';
			overlayProps = null;
		} else if (path === '/' || path === '') {
			overlay = null;
			overlayProps = null;
		}
	}

	function closeOverlay() {
		overlay = null;
		overlayProps = null;
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		replaceState('/', {});
	}

	function backToBlog() {
		overlay = 'blog';
		overlayProps = null;
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		replaceState('/blog', { overlay: 'blog' });
	}

	function preloadBlogList() {
		preloadBlogOverlay();
		if (blogStore.posts.length === 0) {
			blogStore.fetchPage(1);
		}
	}

	let contactOpen = $state(false);
	let contactView = $state<'form' | 'my_messages'>('form');

	function openContact(view: 'form' | 'my_messages') {
		preloadContactModal();
		contactView = view;
		contactOpen = true;
	}

	function closeContact() {
		contactOpen = false;
	}

	function preloadOverlays() {
		preloadWordOverlay();
		preloadBlogOverlay();
		preloadContactModal();
		preloadSuggestOverlay();
		if (devMode) {
			preloadEditWord();
			preloadTranslationForm();
		}
	}

	function openBlog() {
		preloadBlogOverlay();
		overlay = 'blog';
		overlayProps = null;
		pushState('/blog', { overlay: 'blog' });
	}

	function openWord(wordId: string, wordData?: WordData) {
		preloadWordOverlay();
		if (wordData) setCachedWord(wordId, wordData);
		overlay = 'word';
		overlayProps = { wordId, word: wordData ?? getCachedWord(wordId) };
		pushState(`/word/${encodeURIComponent(wordId)}`, { overlay: 'word', wordId });
	}

	function openBlogPost(slug: string) {
		preloadBlogOverlay();
		overlay = 'post';
		overlayProps = { slug };
		pushState(`/blog/${slug}`, { overlay: 'post', slug });
	}

	function openSuggest() {
		preloadSuggestOverlay();
		overlay = 'suggest';
		overlayProps = null;
		pushState('/suggest', { overlay: 'suggest' });
	}

	function handlePopstate(e: PopStateEvent) {
		const s = e.state?.['sveltekit:states'] as Record<string, unknown> | undefined;
		if (s?.overlay === 'blog') {
			overlay = 'blog';
			overlayProps = null;
		} else if (s?.overlay === 'post' && typeof s.slug === 'string') {
			overlay = 'post';
			overlayProps = { slug: s.slug };
		} else if (s?.overlay === 'word' && typeof s.wordId === 'string') {
			overlay = 'word';
			overlayProps = { wordId: s.wordId, word: getCachedWord(s.wordId) };
		} else if (s?.overlay === 'suggest') {
			overlay = 'suggest';
			overlayProps = null;
		} else {
			restoreOverlayFromURL();
		}
	}

	function loadSettings() {
		try {
			devMode = !import.meta.env.PROD && localStorage.getItem('dev_mode') === 'true';
			showComments = localStorage.getItem('show_comments') !== 'false';
			theme.load();
			settings.load();
		} catch (e) {
			console.error(e);
		}
	}

	function toggleDevMode() {
		devMode = !devMode;
		if (devMode) {
			preloadEditWord();
			preloadTranslationForm();
		}
		localStorage.setItem('dev_mode', String(devMode));
	}

	$effect(() => {
		if (devMode) {
			preloadEditWord();
			preloadTranslationForm();
		}
	});

	function toggleComments() {
		showComments = !showComments;
		localStorage.setItem('show_comments', String(showComments));
	}

	async function togglePin(word: WordData) {
		if (!devMode) return;
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(word.id)}/pin`, { method: 'PUT' });
			if (res.ok) {
				const result = await res.json();
				word.is_pinned = result.is_pinned;
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
			const word = allWords.find((w) => w.id === wordId);
			if (word) word.hidden = hidden;
		} catch (e) {
			console.error(e);
		}
	}

	// Populate the fetch-word cache from lists already loaded so crossref
	// hover popups for words visible on the page resolve instantly instead of
	// hitting /api/words/[id] again.
	function cacheWordList(list: WordData[]) {
		for (const word of list) setCachedWord(word.id, word);
	}

	// Load the full dictionary from the API. Runs after first paint (the SSR
	// payload only has the first page) and doubles as the retry path when the
	// server-side load failed; hidden words are included in dev builds.
	async function fetchWords() {
		try {
			const params = new SvelteURLSearchParams();
			params.set('limit', String(FULL_LIST_LIMIT));
			if (devMode) params.set('include_hidden', 'true');
			const res = await fetch(`/api/words?${params}`);
			if (!res.ok) throw new Error('API error');
			const data = await res.json();
			allWords = data.words ?? [];
			cacheWordList(allWords);
			fullListLoaded = true;
			listError = false;
		} catch (e) {
			console.error(e);
			// With SSR words present keep showing them (degraded, no full-text
			// search); otherwise surface the error.
			if (allWords.length === 0) {
				listError = true;
			}
			fullListLoaded = true;
		}
	}

	function scrollToTop() {
		const el = [tableWrapEl, appEl].find((e): e is HTMLDivElement => !!e && e.scrollHeight > e.clientHeight + 1);
		el?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function resetAll() {
		filters.resetFilters();
		scrollToTop();
	}

	function clearSearch() {
		if (!filters.search) return;
		filters.clearSearch();
		searchInput?.blur();
	}

	function onToggleWordLike(wordId: string) {
		const word = allWords.find((w) => w.id === wordId);
		if (word) userStore.toggleWordLike(wordId, word.likes);
	}

	async function deleteWord(wordId: string) {
		if (!confirm(`Выдаліць слова "${wordId}"?`)) return;
		try {
			const res = await fetch(`/api/words/${encodeURIComponent(wordId)}/delete`, {
				method: 'DELETE',
			});
			if (res.ok) {
				allWords = allWords.filter((w) => w.id !== wordId);
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

		const word = allWords.find((w) => w.id === wordId);
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
				for (const word of allWords) {
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
		for (const word of allWords) {
			const tr = word.translations.find((t) => t.id === translationId);
			if (tr) {
				userStore.toggleTranslationLike(translationId, tr.likes);
				break;
			}
		}
	}

	async function exportData() {
		exportError = null;
		const params = new SvelteURLSearchParams();
		if (filters.search) params.set('search', filters.search);
		if (filters.selectedTags.length) params.set('tags', filters.selectedTags.join(','));

		const res = await fetch(`/api/words/export?${params}`);
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			exportError = body?.error || `Памылка ${res.status}`;
			setTimeout(() => (exportError = null), 4000);
			return;
		}

		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = SITE_NAME + '.csv';
		a.click();
		URL.revokeObjectURL(url);
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
		theme.listen();

		cacheWordList(allWords);
		userStore.syncLikeCounts(
			allWords.map((w) => w.id),
			allWords.flatMap((w) => w.translations.map((t) => t.id)),
		);
		// The SSR payload only has the first page — fetch the full dictionary
		// once the browser is idle. Deferring past first paint keeps the heavy
		// dictionary parse/proxy work off the critical path (it inflates LCP
		// if run right after hydration); search/filter/sort still work as soon
		// as it lands.
		const deferIdle = (fn: () => void) => {
			if ('requestIdleCallback' in window) {
				requestIdleCallback(fn, { timeout: 2000 });
			} else {
				setTimeout(fn, 1000);
			}
		};
		if (data.words.length === 0) {
			// Filtered link: nothing to render until the dictionary arrives.
			fetchWords();
		} else {
			deferIdle(() => {
				if (!fullListLoaded) fetchWords();
				// The welcome modal's chunk is warmed here too, so it never
				// competes with the first paint or LCP for the main thread.
				preloadWelcomeModal();
			});
		}

		// The welcome modal used to open on mount and became the LCP element
		// on cold visits (its overlay/text was the largest paint once hydration
		// finished). Open it on the first scroll instead — the scroll is the
		// interaction that finalizes LCP, so the modal never shows up in the
		// metric. capture:true catches scrolls on the inner scroll containers.
		// Its component is loaded lazily (preloadWelcomeModal), so nothing
		// modal-related ships in the initial bundle; the open state renders as
		// soon as the chunk lands, even if the user scrolls before the idle
		// warmup fires.
		const showWelcomeOnScroll = () => {
			if (localStorage.getItem('welcome_dismissed')) {
				window.removeEventListener('scroll', showWelcomeOnScroll, { capture: true });
				return;
			}
			preloadWelcomeModal();
			showWelcome = true;
			window.removeEventListener('scroll', showWelcomeOnScroll, { capture: true });
		};
		window.addEventListener('scroll', showWelcomeOnScroll, { capture: true, passive: true });
		restoreOverlayFromURL();
		preloadOverlays();
		window.addEventListener('popstate', handlePopstate);
		return () => {
			window.removeEventListener('popstate', handlePopstate);
			window.removeEventListener('scroll', showWelcomeOnScroll, { capture: true });
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
		if ((e.ctrlKey || e.metaKey) && e.code === 'KeyF' && !overlay) {
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
	<AppHeader
		showFavorites={filters.showFavorites}
		{showComments}
		onReset={resetAll}
		onOpenBlog={openBlog}
		onPreloadBlog={preloadBlogList}
		onOpenSuggest={openSuggest}
		onPreloadSuggest={preloadSuggestOverlay}
		onToggleFavorites={() => filters.toggleShowFavorites()}
		onToggleComments={toggleComments}
		onToggleLatin={() => settings.toggleLatin()}
		onToggleTheme={() => theme.toggle()}
	/>

	{#if !import.meta.env.PROD}
		<div class="dev">
			<AddEntity {tags} onWordAdded={() => fetchWords()} />
			<button class="header-btn" onclick={toggleDevMode} aria-label="Toggle developer mode">
				{devMode ? 'Dev ON' : 'Dev OFF'}
			</button>
			<button class="header-btn" onclick={exportData} aria-label="Export CSV"> Сьцягнуць </button>
		</div>
	{/if}

	<WordControls
		{tags}
		selectedTags={filters.selectedTags}
		{total}
		sort={filters.sort}
		order={filters.order}
		bind:search={filters.search}
		bind:searchInput
		onSearchInput={() => filters.doSearch()}
		onSearchEnter={() => filters.doSearch()}
		onSearchEscape={clearSearch}
		onClearSearch={clearSearch}
		onTagFilter={(tag) => filters.handleTagFilter(tag)}
		onSort={(field) => filters.handleSort(field)}
	/>

	<div class="table-wrap" bind:this={tableWrapEl}>
		{#if loading && allWords.length === 0}
			<div class="loading">Ладаваньне...</div>
		{:else if listError}
			<div class="loading">
				<p>Не ўдалося заладаваць словы. Спраўдзьце падлучэньне да інтэрнэту.</p>
				<button class="pill retry-btn" onclick={fetchWords}>Паспрабаваць ізноў</button>
			</div>
		{:else if !loading && visibleWords.length === 0}
			<div class="empty">{filters.showFavorites ? 'Няма ўпадабаньняў' : 'Словы ня знойдзеныя'}</div>
		{:else}
			{#if showPinned && pinnedWords.length > 0}
				<div class="grid-table grid-table--pinned" role="table">
					<div role="row" class="sr-only">
						<div role="columnheader">Слова тыдня</div>
						<div role="columnheader">Пераклад</div>
						<div role="columnheader">Лайкі</div>
					</div>
					{#each pinnedWords as word (word.id)}
						<div class="grid-row grid-row--pinned" role="row">
							<span class="pinned-banner">
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
										>{@html highlightText(word.id, latToCyr(filters.search))}</span
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
											searchQuery={filters.search}
											onWordLink={openWord}
											popupChain={[word.id]}
										/>
										{#if !parseCrossref(tr.translation)}
											<LikeButton
												liked={!!userStore.translations[tr.id]}
												count={userStore.getTranslationLikeCount(tr.id, tr.likes)}
												onclick={() => onToggleTranslationLike(tr.id)}
												label="Like translation"
												small
											/>
										{/if}
									</div>
								{/each}
								{#if word.translations.length === 0}
									<span class="muted">Не перакладзена</span>
								{/if}
							</div>
							<div class="col-likes" role="cell">
								<LikeButton
									liked={!!userStore.words[word.id]}
									count={userStore.getWordLikeCount(word.id, word.likes)}
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
				{#each pagedWords as word (word.id)}
					<div class="grid-row" role="row">
						{#if word.created_at && Date.now() - new Date(word.created_at).getTime() < 7 * 24 * 60 * 60 * 1000}
							<span class="new-badge">Новае</span>
						{/if}
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
									>{@html highlightText(word.id, latToCyr(filters.search))}</span
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
								{#if overlays.editWord}
									{@const EditWordC = overlays.editWord}
									<EditWordC {tags} {word} onWordEdited={() => fetchWords()} />
								{/if}
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
										searchQuery={filters.search}
										onWordLink={openWord}
										popupChain={[word.id]}
									/>
									{#if !parseCrossref(tr.translation)}
										<LikeButton
											liked={!!userStore.translations[tr.id]}
											count={userStore.getTranslationLikeCount(tr.id, tr.likes)}
											onclick={() => onToggleTranslationLike(tr.id)}
											label="Like translation"
											small
										/>
									{/if}
									{#if devMode}
										{#if overlays.translationForm}
											{@const TranslationFormC = overlays.translationForm}
											<TranslationFormC translation={tr} onDone={() => fetchWords()} />
										{/if}
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
								{#if overlays.translationForm}
									{@const TranslationFormC = overlays.translationForm}
									<TranslationFormC wordId={word.id} onDone={() => fetchWords()} />
								{/if}
							{/if}
						</div>
						<div class="col-likes" role="cell">
							<LikeButton
								liked={!!userStore.words[word.id]}
								count={userStore.getWordLikeCount(word.id, word.likes)}
								onclick={() => onToggleWordLike(word.id)}
								label="Like word"
							/>
						</div>
					</div>
				{/each}
			</div>
			{#if hasMore}
				<div class="footer-loading" bind:this={loadMoreEl} role="status">Ладаваньне...</div>
			{/if}
		{/if}
		{#if filters.search && !loading && !listError}
			<div class="table-footer">
				<ContactTrigger userToken={userStore.userToken} open={contactOpen} onOpen={openContact} />
			</div>
		{/if}
	</div>
	{#if copiedSearch}
		<div class="copy-toast">Спасылка скапіяваная</div>
	{/if}
	{#if exportError}
		<div class="copy-toast error" role="alert">{exportError}</div>
	{/if}
	{#if showScrollTop}
		<button class="scroll-top" onclick={scrollToTop} aria-label="Scroll to top">
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

{#if showWelcome && overlays.welcome}
	{@const WelcomeModalC = overlays.welcome}
	<WelcomeModalC
		title="Вітаем"
		open={showWelcome}
		onclose={() => {
			showWelcome = false;
			localStorage.setItem('welcome_dismissed', '1');
		}}
		closeOnOverlay
	>
		<p>
			Нам вельмі важна, каб гэты праект зыскаў (састарэлае слоўца для калярыту) як мага болей увагі й распаўсюду,
			таму будзем удзячныя, калі вы спрычыніцеся да гэтае справы разам з намі й падзеліцеся спасылкай з кім можаце
			🙂 Таксама вельмі дапамогуць публічныя спасылкі, будзь тое ў X, Instagram, VK ці дзе яшчэ. Шчыра дзякуем!<br
			/><br />
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
	</WelcomeModalC>
{/if}

{#if contactOpen && overlays.contact}
	{@const ContactModalC = overlays.contact}
	<ContactModalC
		userToken={userStore.userToken}
		{devMode}
		open={contactOpen}
		initialView={contactView}
		onclose={closeContact}
	/>
{/if}

{#if overlay === 'blog' || overlay === 'post'}
	{#if overlays.blog}
		{@const BlogOverlayC = overlays.blog}
		<BlogOverlayC
			onOpenPost={openBlogPost}
			initialSlug={overlayProps?.slug}
			onclose={closeOverlay}
			onBackToBlog={backToBlog}
		/>
	{:else}
		<div class="overlay-loading">
			<div class="overlay-loading-spinner" aria-hidden="true"></div>
			<span>Ладаваньне...</span>
		</div>
	{/if}
{/if}

{#if overlay === 'word'}
	{#if overlays.word}
		{@const WordOverlayC = overlays.word}
		<WordOverlayC
			initialWordId={overlayProps?.wordId}
			initialWord={overlayProps?.word}
			onWordLink={openWord}
			onclose={closeOverlay}
		/>
	{:else}
		<div class="overlay-loading">
			<div class="overlay-loading-spinner" aria-hidden="true"></div>
			<span>Ладаваньне...</span>
		</div>
	{/if}
{/if}

{#if overlay === 'suggest'}
	{#if overlays.suggest}
		{@const SuggestOverlayC = overlays.suggest}
		<SuggestOverlayC userToken={userStore.userToken} {devMode} onclose={closeOverlay} />
	{:else}
		<div class="overlay-loading">
			<div class="overlay-loading-spinner" aria-hidden="true"></div>
			<span>Ладаваньне...</span>
		</div>
	{/if}
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

	.table-wrap {
		flex: 1;
		min-height: 0;
		background: var(--c-surface);
		box-shadow: var(--shadow-md);
		overflow-y: auto;
	}

	.grid-row {
		border-bottom: 1px solid var(--c-border);
		transition: background 0.1s;
		position: relative;
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
		padding: 1rem;
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

	.col-likes :global(.pill) {
		margin-top: 0.9rem;
	}

	.meta-row {
		padding-top: 0.5rem;
	}

	.translation-item {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 0.35rem;
		padding: 0.5rem 0;
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

	.copy-toast.error {
		background: var(--c-error, #d32f2f);
		color: #fff;
		animation: fade-in-out 4s ease-in-out;
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
		padding: 0.75rem 1rem;
		color: var(--c-text-muted);
	}

	.loading,
	.empty {
		padding: 3rem 1rem;
		text-align: center;
		color: var(--c-text-muted);
		font-size: 0.95rem;
	}

	.retry-btn {
		margin-top: 0.75rem;
	}

	@media (width <= 1024px) {
		.app {
			overflow-y: auto;
		}

		.table-wrap {
			flex: none;
		}
	}

	@media (width <= 640px) {
		.app {
			padding: 0 0.75rem;
			padding-bottom: env(safe-area-inset-bottom, 0.75rem);
		}

		.table-wrap {
			background: transparent;
			box-shadow: none;
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
			padding-top: 0.25rem;
			grid-column: 1 / -1;
		}

		.col-likes {
			grid-column: 1 / -1;
			justify-self: end;
		}

		.col-likes :global(.pill) {
			margin-top: 0;
		}

		.translation-item {
			padding: 0.5rem 0;
		}

		.table-footer {
			margin: 0.75rem 0;
		}
	}

	:global(.translation-item:first-child) {
		padding-top: 0;
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

	.grid-row > .pinned-banner {
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

	.grid-row--pinned > .col-likes :global(.pill) {
		margin-top: 0.15rem;
	}

	.grid-table--pinned .grid-row:last-child {
		border-bottom: 1px solid var(--c-border);
	}

	.new-badge {
		position: absolute;
		top: 0;
		left: 0;
		background: var(--c-importance-2);
		color: #fff;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.1rem 0.5rem;
		border-radius: 0 0 var(--radius-sm) 0;
		line-height: 1.4;
		pointer-events: none;
		z-index: 1;
	}

	.overlay-loading {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: var(--c-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: var(--c-text-muted);
		font-size: 0.9rem;
	}

	.overlay-loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid var(--c-border);
		border-top-color: var(--c-primary);
		border-radius: 50%;
		animation: overlay-spin 0.8s linear infinite;
	}

	@keyframes overlay-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (width <= 640px) {
		.grid-row > .pinned-banner {
			padding: 0;
		}

		.grid-row--pinned > .col-word,
		.grid-row--pinned > .col-trans {
			padding-top: 0;
		}

		.grid-table--pinned {
			margin-bottom: 0.75rem;
		}

		.new-badge {
			border-radius: 0 var(--radius) var(--radius) 0;
			padding: 0.05rem 0.35rem;
			line-height: 1.2;
		}
	}
</style>
