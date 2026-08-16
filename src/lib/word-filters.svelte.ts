import { DEFAULT_ORDER, DEFAULT_SORT } from '$lib/constants';
import { replaceState } from '$app/navigation';
import { SvelteURLSearchParams } from 'svelte/reactivity';

export interface WordFiltersOptions {
	search?: string;
	sort?: string;
	order?: string;
	sortExplicit?: boolean;
	selectedTags?: string[];
	allTagNames: string[];
}

// Owns the search / sort / tag / favorites filter state for the word list and
// keeps the URL in sync so a shared link restores the same view. Pure UI
// state: the actual filtering/sorting happens in word-search.ts.
export class WordFilters {
	search = $state('');
	sort = $state(DEFAULT_SORT);
	order = $state(DEFAULT_ORDER);
	sortExplicit = $state(false);
	selectedTags = $state<string[]>([]);
	showFavorites = $state(false);
	allTagNames: string[];

	constructor(opts: WordFiltersOptions) {
		this.allTagNames = opts.allTagNames;
		this.search = opts.search ?? '';
		this.sort = opts.sort ?? DEFAULT_SORT;
		this.order = opts.order ?? DEFAULT_ORDER;
		this.sortExplicit = opts.sortExplicit ?? false;
		this.selectedTags = opts.selectedTags ?? [...opts.allTagNames];
	}

	syncUrlParams() {
		const params = new SvelteURLSearchParams();
		if (this.search) params.set('search', this.search);
		if (this.sort !== DEFAULT_SORT) params.set('sort', this.sort);
		if (this.order !== DEFAULT_ORDER) params.set('order', this.order);
		if (this.selectedTags.length > 0 && this.selectedTags.length < this.allTagNames.length) {
			params.set('tags', this.selectedTags.join(','));
		}
		const qs = params.toString();
		/* eslint-disable-next-line svelte/no-navigation-without-resolve */
		replaceState(qs ? `/?${qs}` : '/', {});
	}

	// Searching without an explicit sort switches to relevance, matching the
	// old server behavior; clearing it restores the defaults.
	doSearch() {
		if (this.search && !this.sortExplicit && this.sort === DEFAULT_SORT) {
			this.sort = 'relevance';
			this.order = 'desc';
		} else if (!this.search && this.sort === 'relevance') {
			this.sort = DEFAULT_SORT;
			this.order = DEFAULT_ORDER;
		}
		this.syncUrlParams();
	}

	handleSort(field: string) {
		this.sortExplicit = true;
		if (this.sort === field) {
			this.order = this.order === 'asc' ? 'desc' : 'asc';
		} else {
			this.sort = field;
			this.order = field === 'word' ? 'asc' : 'desc';
		}
		this.syncUrlParams();
	}

	handleTagFilter(tagName: string) {
		if (this.selectedTags.includes(tagName)) {
			this.selectedTags = this.selectedTags.filter((t) => t !== tagName);
		} else {
			this.selectedTags = [...this.selectedTags, tagName];
		}
		this.syncUrlParams();
	}

	clearSearch() {
		if (!this.search) return;
		this.search = '';
		this.doSearch();
	}

	resetFilters() {
		this.search = '';
		this.sort = DEFAULT_SORT;
		this.order = DEFAULT_ORDER;
		this.sortExplicit = false;
		this.selectedTags = [...this.allTagNames];
		this.showFavorites = false;
		this.syncUrlParams();
	}

	toggleShowFavorites() {
		this.showFavorites = !this.showFavorites;
	}
}
