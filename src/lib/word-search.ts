import { normalizeText } from '$lib/highlight';
import { latToCyr } from '$lib/lacinka';
import { parseCrossref, type WordData } from '$lib/types';

export interface WordQuery {
	search: string;
	sort: string;
	order: string;
	selectedTags: string[];
	allTags: string[];
	// When favorites filtering is active, the liked word ids; null otherwise.
	favoriteIds: string[] | null;
}

// Mirrors the server's get_words search input handling: latToCyr first, then
// split on whitespace, each term normalized for lenient cross-script matching.
function parseTerms(search: string): string[] {
	return latToCyr(search).trim().split(/\s+/).map(normalizeText).filter(Boolean);
}

function matchesTerm(term: string, word: WordData): boolean {
	return (
		normalizeText(word.id).includes(term) ||
		word.translations.some((t) => normalizeText(t.translation).includes(term))
	);
}

// A crossref translation ("гл. X" / "параўн. Y") points to another entry
// instead of translating it, so a term found only there shouldn't rank as
// high as a real translation.
function hasRealTranslationMatch(word: WordData, term: string): boolean {
	return word.translations.some((t) => !parseCrossref(t.translation) && normalizeText(t.translation).includes(term));
}

// Approximates the SQL relevance ranking (pg_trgm similarity). Deliberately
// simple and deterministic: a term in the word itself beats one only found in
// a translation, and a prefix match beats a mid-word one. Crossref matches
// rank below real translations (they're "see also" pointers, not translations).
function relevanceScore(word: WordData, terms: string[]): number {
	let score = 0;
	for (const term of terms) {
		const id = normalizeText(word.id);
		if (id.startsWith(term)) score += 3;
		else if (id.includes(term)) score += 2;
		else if (hasRealTranslationMatch(word, term)) score += 1;
	}
	return score;
}

function importanceLevel(level: number | null | undefined): number {
	return level ?? 0;
}

function createdAtMs(createdAt: string | null): number {
	return createdAt ? new Date(createdAt).getTime() : 0;
}

// Belarusian-alphabet order via ICU collation ('be'). Plain UTF-16 comparison
// is wrong here: і (U+0456) has a higher codepoint than я (U+044F), so і-words
// would sort after я, but in the Belarusian alphabet і sits between з and й.
// Codepoint comparison is kept as a deterministic tiebreak.
function compareIds(a: string, b: string): number {
	const la = a.toLowerCase();
	const lb = b.toLowerCase();
	const cmp = la.localeCompare(lb, 'be');
	if (cmp !== 0) return cmp;
	return la < lb ? -1 : la > lb ? 1 : 0;
}

export function sortWords(words: WordData[], sort: string, order: string): WordData[] {
	const dir = order === 'asc' ? 1 : -1;
	return [...words].sort((a, b) => {
		let cmp: number;
		switch (sort) {
			case 'likes':
				cmp = a.likes - b.likes;
				break;
			case 'created_at':
				cmp = createdAtMs(a.created_at) - createdAtMs(b.created_at);
				break;
			case 'importance':
				cmp = importanceLevel(a.importance.level) - importanceLevel(b.importance.level);
				break;
			default:
				cmp = compareIds(a.id, b.id);
				break;
		}
		if (cmp !== 0) return cmp * dir;
		return compareIds(a.id, b.id);
	});
}

export function queryWords(words: WordData[], q: WordQuery): WordData[] {
	let result = words;

	if (q.selectedTags.length < q.allTags.length && q.allTags.length > 0) {
		const selected = new Set(q.selectedTags);
		result = result.filter((w) => w.tags.some((t) => selected.has(t)));
	}

	if (q.favoriteIds !== null) {
		const favorites = new Set(q.favoriteIds);
		result = result.filter((w) => favorites.has(w.id));
	}

	const terms = parseTerms(q.search);
	if (terms.length > 0) {
		result = result.filter((w) => terms.every((t) => matchesTerm(t, w)));
	}

	if (q.sort === 'relevance' && terms.length > 0) {
		return result.sort((a, b) => relevanceScore(b, terms) - relevanceScore(a, terms) || compareIds(a.id, b.id));
	}

	return sortWords(result, q.sort, q.order);
}
