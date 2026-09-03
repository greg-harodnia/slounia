import { normalizeText } from '$lib/highlight';
import { latToCyr } from '$lib/lacinka';
import { parseCrossref, type WordData } from '$lib/types';

// Strip all apostrophe variants (mirrors SQL normalize_text which strips them
// entirely).  normalizeText keeps them as U+2019 for highlight regex, but
// search matching must be lenient: "абяў" must find "аб'яўляць" and vice versa.
function stripApostrophes(s: string): string {
	return s.replace(/[ʼ'`\u2019]/g, '');
}

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
	const stripped = stripApostrophes(term);
	return (
		stripApostrophes(normalizeText(word.id)).includes(stripped) ||
		word.translations.some((t) => stripApostrophes(normalizeText(t.translation)).includes(stripped))
	);
}

// A crossref translation ("гл. X" / "параўн. Y") points to another entry
// instead of translating it, so a term found only there shouldn't rank as
// high as a real translation.
function hasRealTranslationMatch(word: WordData, term: string): boolean {
	const stripped = stripApostrophes(term);
	return word.translations.some(
		(t) => !parseCrossref(t.translation) && stripApostrophes(normalizeText(t.translation)).includes(stripped),
	);
}

// Approximates the SQL relevance ranking (pg_trgm similarity). Deliberately
// simple and deterministic: a term in the word itself beats one only found in
// a translation, and a prefix match beats a mid-word one. Crossref matches
// rank below real translations (they're "see also" pointers, not translations).
function relevanceScore(word: WordData, terms: string[]): number {
	let score = 0;
	for (const term of terms) {
		const stripped = stripApostrophes(term);
		const id = stripApostrophes(normalizeText(word.id));
		if (id.startsWith(stripped)) score += 3;
		else if (id.includes(stripped)) score += 2;
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

// "Did you mean" suggestions: words that don't literally match the query but
// share its morphological root (tolerating the а↔о vowel alternation). See
// findSimilarWords below for the ranking rules.
export interface SimilarSuggestion {
	word: WordData;
	score: number;
}

// True morphological roots tolerate vowel alternations (а/о): "накапленне" and
// "накоплены" share the root "накап"/"накоп" differing by one vowel; "хапіць"
// and "хопіць" share "хап"/"хоп" likewise. We compare the leading window of
// both words and call a root shared when they're equal except for at most one
// а↔о substitution. Restricting the tolerated edit to that vowel pair is key:
// a generic "any one substitution" would root-match unrelated words that differ
// in a consonant ("канал"/"кавал" differ at н↔в), and a purely contiguous
// common-suffix matcher would flood results with "-енне" strangers having no
// root in common. The window must be at least MIN_ROOT_WINDOW long so a short
// accidental overlap ("так" vs the "накап"-root) can't be a root.
const ROOT_WINDOW = 5;
const MIN_ROOT_WINDOW = 4;

// True only when the leading windows are equal except for at most one а↔о
// substitution (vowel alternation). Any consonant mismatch — or more than one
// edit — means the words don't share a morphological root. The swap accepts both
// the Cyrillic (а/о) and Latin (a/o) forms so the root comparison also works on
// Latin-converted display text.
function isAoSwap(x: string, y: string): boolean {
	const aVowel = (c: string) => c === 'а' || c === 'a';
	const oVowel = (c: string) => c === 'о' || c === 'o';
	return (aVowel(x) && oVowel(y)) || (oVowel(x) && aVowel(y));
}

function sharesRoot(candidate: string, query: string): boolean {
	const window = Math.min(candidate.length, query.length, ROOT_WINDOW);
	if (window < MIN_ROOT_WINDOW) return false;
	const a = candidate.slice(0, window);
	const b = query.slice(0, window);
	let substituted = false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] === b[i]) continue;
		if (!isAoSwap(a[i], b[i]) || substituted) return false;
		substituted = true;
	}
	return true;
}

// Length of the longest common leading run, tolerating а↔о alternations (a vowel
// swap doesn't stop the walk, a consonant mismatch does). Drives the similarity
// score so a candidate that matches more of the query outranks one that merely
// shares the root: "Прадаўжаць (…)" shares 10 of the query's first 10 chars with
// "прадаўжаць", while "Прадастаўляць"/"прадаўшчык" share only 5–6, so the real
// match floats to the top instead of tying on the fixed root window.
function sharedRootLength(a: string, b: string): number {
	const n = Math.min(a.length, b.length);
	let len = 0;
	for (let i = 0; i < n; i++) {
		if (a[i] === b[i] || isAoSwap(a[i], b[i])) len++;
		else break;
	}
	return len;
}

// Splits an id or translation into its comma(/slash/parenthesis)-separated units
// so the tolerant root comparison can reach a root buried in a list — "Капіць,
// накапліваць, зберагаць" → "накапліваць", which shares the накап-/накоп- root
// with "накоплены". Splitting is the ONLY way to recognize that entry as similar:
// the а/о vowel breaks any contiguous-run match, and the whole id doesn't start
// with the root. This is the ground truth the "did you mean" is built on.
function components(text: string): string[] {
	return text
		.split(/[(),/;:&–—-]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

// Per-unit "similar part": a unit that shares the query's root scores the length
// of its longest common leading run (tolerating а↔о) over the search term's
// length, so a candidate that matches more of the query ranks higher than one
// that only shares the root. Anything that doesn't share the root scores 0 —
// long common suffixes are intentionally not treated as similar. Dividing by the
// term length keeps longer candidates from inflating their own score.
//
// A unit must also clear MIN_SIMILARITY_RATIO of the query: merely sharing the
// short leading root ("Прадаўжаць (…)" query vs "прадаўшчык", which shares only
// "прада"=5 of the 26-char query) shouldn't surface an unrelated word. For a
// short query the root is a large share and passes; for a long query a
// bare-root match is only a few chars and is dropped.
const MIN_SIMILARITY_RATIO = 0.4;

function candidateRatio(text: string, term: string): number {
	if (!sharesRoot(text, term)) return 0;
	const ratio = sharedRootLength(text, term) / term.length;
	return ratio >= MIN_SIMILARITY_RATIO ? ratio : 0;
}

// Best candidateRatio across a whole text and each of its comma-separated units.
function bestRatioAcrossUnits(text: string, term: string): number {
	let best = candidateRatio(text, term);
	for (const c of components(text)) best = Math.max(best, candidateRatio(c, term));
	return best;
}

// Returns the exact range(s) — as [start, end) non-stress char indices into the
// ORIGINAL `text` — of every leading root that made that text a "did you mean"
// match for any of the given terms. A component is highlighted only if it
// independently clears the same ratio/root gate used by findSimilarWords, so
// the markup reflects precisely the reason the suggestion surfaced. Used with
// highlightRanges on the word id and translations when similar words replace
// empty results.
export function rootRangesOf(text: string, term: string | string[]): [number, number][] {
	const terms = Array.isArray(term) ? term : [term];
	const normChars = [...stripApostrophes(normalizeText(text))];
	if (normChars.length === 0) return [];
	// Normalize each term too (they may be Latin-converted queries for Latin
	// display): normalizeText maps i→і, ł→l, ŭ→u etc., so the prefix/а↔о
	// comparison runs on two strings normalized in the same way.
	const normTerms = terms.map(normalizeText);

	// Align each normalized/apostrophe-stripped char to the char index used by
	// renderMarks/highlightRanges, which counts every non-stress char (stress
	// marks add no width, apostrophes still count). normalizeText's
	// replacements are 1:1 per char, so both sides align positionally once the
	// apostrophe/stress/space bookkeeping is consistent.
	const normToCi: number[] = [];
	{
		let ci = 0;
		for (let oi = 0; oi < text.length; oi++) {
			const c = text[oi];
			if (c === '\u0301') continue;
			if (stripApostrophes(c) === '') {
				ci++;
				continue;
			}
			normToCi.push(ci);
			ci++;
		}
	}

	const ranges: [number, number][] = [];
	const sepRe = /[(),/;:&–—-]+/;
	let seg: string[] = [];
	let segStart = 0;
	const flush = (start: number, chars: string[]): void => {
		const joined = chars.join('');
		const trimmed = joined.trim();
		if (!trimmed) return;
		let bestR = 0;
		for (const nt of normTerms) {
			const cr = candidateRatio(trimmed, nt);
			if (cr <= 0) continue;
			const r = sharedRootLength(trimmed, nt);
			if (r > bestR) bestR = r;
		}
		if (bestR <= 0) return;
		const s = start + (joined.length - joined.trimStart().length);
		const ciStart = normToCi[s];
		const ciEnd = normToCi[s + Math.max(0, bestR - 1)] + 1;
		ranges.push([ciStart, ciEnd]);
	};
	for (let i = 0; i < normChars.length; i++) {
		const c = normChars[i];
		if (sepRe.test(c)) {
			flush(segStart, seg);
			seg = [];
			segStart = i + 1;
		} else {
			seg.push(c);
		}
	}
	flush(segStart, seg);
	return ranges;
}

// The normalized query terms (apostrophe-stripped, Cyrillic, case-folded) that
// "did you mean" root-matching compares against. Shared by findSimilarWords and
// the root-range highlighter so both highlight/match the exact same root. When
// the query contains whitespace, each term is normalized independently so a
// word can match any one of them (the literal matcher splits on whitespace; the
// root matcher must too, otherwise "тэст, крушэнне" fails to find "Крушэнне,
// крах" because the comma stays attached to the first term and the
// leading-window comparison never reaches the second). Punctuation attached to
// a term (commas, parentheses, periods from multi-word queries) is stripped so
// "працягваць," doesn't become a distinct token that can't match "працягваць".
export function similarityTerms(search: string): string[] {
	return latToCyr(search)
		.trim()
		.split(/\s+/)
		.map((t) => stripApostrophes(normalizeText(t)).replace(/[(),/;:&–—-]+/g, ''))
		.filter(Boolean);
}

// Legacy single-term variant: joins all terms. Used only by rootRangesOf
// (which needs a single string for the root-range highlighter).
export function similarityTerm(search: string): string {
	return similarityTerms(search).join(' ');
}

// Returns every word recognizably close to an unmatched query (no fixed cap —
// show whoever is most similar, be it 1 or 100), best match first. A match in
// the word id is weighted higher than a match found only via a translation
// (mirroring the relevance ranking that drives real results). The whole
// normalized query is compared (not just its first word): multi-word entries
// like "Прадаўжаць (працягваць), прадаўжальнік" are full ids, so a search
// that's nearly identical to such an id — even with a trailing typo like
// "прадаўжальнікккк" — must match it at near-full similarity, not a partial
// root overlap.
export function findSimilarWords(words: WordData[], search: string): SimilarSuggestion[] {
	const terms = similarityTerms(search);
	if (terms.length === 0) return [];

	const scored: { word: WordData; best: number }[] = [];
	for (const word of words) {
		let best = 0;
		const idNorm = stripApostrophes(normalizeText(word.id));
		for (const term of terms) {
			const idRatio = bestRatioAcrossUnits(idNorm, term);
			if (idRatio * 1.5 > best) best = idRatio * 1.5;
		}
		for (const t of word.translations) {
			const tNorm = stripApostrophes(normalizeText(t.translation));
			for (const term of terms) {
				const r = bestRatioAcrossUnits(tNorm, term);
				if (r > best) best = r;
			}
		}
		if (best > 0) scored.push({ word, best });
	}

	return scored
		.sort((a, b) => b.best - a.best || compareIds(a.word.id, b.word.id))
		.map((x) => ({ word: x.word, score: x.best }));
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
