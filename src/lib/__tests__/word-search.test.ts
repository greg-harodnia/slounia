import { describe, it, expect } from 'vitest';
import { queryWords, sortWords, findSimilarWords, rootRangesOf } from '../word-search';
import { highlightRanges } from '../highlight';
import type { WordData } from '../types';

function mkWord(partial: Partial<WordData> & { id: string }): WordData {
	return {
		importance: { id: null, name: null, level: null },
		comment: null,
		likes: 0,
		views: 0,
		hidden: false,
		is_pinned: false,
		created_at: null,
		translations: [],
		tags: [],
		...partial,
	};
}

function baseQuery(overrides: Record<string, unknown> = {}) {
	return {
		search: '',
		sort: 'word',
		order: 'asc',
		selectedTags: [],
		allTags: [],
		favoriteIds: null,
		...overrides,
	};
}

describe('queryWords', () => {
	it('returns all words when no filters are active', () => {
		const words = [mkWord({ id: 'б' }), mkWord({ id: 'а' })];
		const result = queryWords(words, baseQuery());
		expect(result.map((w) => w.id)).toEqual(['а', 'б']);
	});

	it('filters by selected tags', () => {
		const words = [
			mkWord({ id: 'кава', tags: ['ежа'] }),
			mkWord({ id: 'дом', tags: ['хата'] }),
			mkWord({ id: 'стол', tags: ['ежа', 'хата'] }),
		];
		const result = queryWords(words, baseQuery({ selectedTags: ['ежа'], allTags: ['ежа', 'хата'] }));
		expect(result.map((w) => w.id).sort()).toEqual(['кава', 'стол']);
	});

	it('does not filter when all tags are selected', () => {
		const words = [mkWord({ id: 'кава', tags: ['ежа'] }), mkWord({ id: 'дом', tags: ['хата'] })];
		const result = queryWords(words, baseQuery({ selectedTags: ['ежа', 'хата'], allTags: ['ежа', 'хата'] }));
		expect(result).toHaveLength(2);
	});

	it('filters by favorites', () => {
		const words = [mkWord({ id: 'кава' }), mkWord({ id: 'дом' })];
		const result = queryWords(words, baseQuery({ favoriteIds: ['дом'] }));
		expect(result.map((w) => w.id)).toEqual(['дом']);
	});

	it('matches a term inside the word', () => {
		const words = [mkWord({ id: 'кава' }), mkWord({ id: 'дом' })];
		const result = queryWords(words, baseQuery({ search: 'кав' }));
		expect(result.map((w) => w.id)).toEqual(['кава']);
	});

	it('matches a term inside a translation', () => {
		const words = [
			mkWord({ id: 'што', translations: [{ id: 1, translation: 'што такое', comment: null, likes: 0 }] }),
			mkWord({ id: 'калі', translations: [{ id: 2, translation: 'калі ласка', comment: null, likes: 0 }] }),
		];
		const result = queryWords(words, baseQuery({ search: 'ласка' }));
		expect(result.map((w) => w.id)).toEqual(['калі']);
	});

	it('requires all terms to match (AND semantics)', () => {
		const words = [
			mkWord({
				id: 'беларуская',
				translations: [{ id: 1, translation: 'мова', comment: null, likes: 0 }],
			}),
			mkWord({
				id: 'беларусь',
				translations: [{ id: 2, translation: 'краіна', comment: null, likes: 0 }],
			}),
		];
		const result = queryWords(words, baseQuery({ search: 'беларуская мова' }));
		expect(result.map((w) => w.id)).toEqual(['беларуская']);
	});

	it('matches Latin input against Cyrillic words via latToCyr', () => {
		const words = [mkWord({ id: 'мінск' }), mkWord({ id: 'гомель' })];
		const result = queryWords(words, baseQuery({ search: 'minsk' }));
		expect(result.map((w) => w.id)).toEqual(['мінск']);
	});

	it('is lenient about ё/е and г/ґ via normalizeText', () => {
		const words = [mkWord({ id: 'мёд' }), mkWord({ id: 'дом' })];
		expect(queryWords(words, baseQuery({ search: 'мед' })).map((w) => w.id)).toEqual(['мёд']);
		const gwords = [mkWord({ id: 'гандаль' }), mkWord({ id: 'мора' })];
		expect(queryWords(gwords, baseQuery({ search: 'ґандаль' })).map((w) => w.id)).toEqual(['гандаль']);
	});

	it('is lenient about apostrophes: finds word with apostrophe when searching without', () => {
		const words = [mkWord({ id: "аб'яўляць" }), mkWord({ id: 'дом' })];
		expect(queryWords(words, baseQuery({ search: 'абяў' })).map((w) => w.id)).toEqual(["аб'яўляць"]);
	});

	it('is lenient about apostrophes: finds word without apostrophe when searching with', () => {
		const words = [mkWord({ id: 'абяўляць' }), mkWord({ id: 'дом' })];
		expect(queryWords(words, baseQuery({ search: "аб'яў" })).map((w) => w.id)).toEqual(['абяўляць']);
	});

	it('ranks word prefix matches above word substring matches above translation matches', () => {
		const words = [
			mkWord({ id: 'кава', translations: [{ id: 1, translation: 'напой', comment: null, likes: 0 }] }),
			mkWord({ id: 'накавальня', translations: [{ id: 2, translation: 'каваць', comment: null, likes: 0 }] }),
			mkWord({ id: 'дом', translations: [{ id: 3, translation: 'кавамашына', comment: null, likes: 0 }] }),
		];
		const result = queryWords(words, baseQuery({ search: 'кава', sort: 'relevance', order: 'desc' }));
		expect(result.map((w) => w.id)).toEqual(['кава', 'накавальня', 'дом']);
	});

	it('ranks real translation matches above crossref ("гл./параўн.") matches', () => {
		const words = [
			mkWord({ id: 'наведвальнік' }),
			mkWord({
				id: 'гасцёўня',
				translations: [{ id: 1, translation: 'гл. Наведвальнік', comment: null, likes: 0 }],
			}),
			mkWord({
				id: 'посведка',
				translations: [{ id: 2, translation: 'наведвальнік мерапрыемства', comment: null, likes: 0 }],
			}),
		];
		const result = queryWords(words, baseQuery({ search: 'наведвальнік', sort: 'relevance', order: 'desc' }));
		// гасцёўня still matches (via its crossref) but sinks to the bottom.
		expect(result.map((w) => w.id)).toEqual(['наведвальнік', 'посведка', 'гасцёўня']);
	});
});

describe('findSimilarWords', () => {
	it('returns nothing for an empty or whitespace query', () => {
		expect(findSimilarWords([mkWord({ id: 'кава' })], '')).toEqual([]);
		expect(findSimilarWords([mkWord({ id: 'кава' })], '   ')).toEqual([]);
	});

	it('suggests words with a shared run of characters even without a literal substring match', () => {
		const words = [
			mkWord({ id: 'кава' }),
			mkWord({ id: 'кавальня' }),
			mkWord({ id: 'дом' }),
			mkWord({ id: 'канал' }),
		];
		const result = findSimilarWords(words, 'кавал').map((s) => s.word.id);
		expect(result).toContain('кава');
		expect(result).toContain('кавальня');
		expect(result).not.toContain('дом');
		// "канал" only shares a 2-char run ("ка"), below the floor.
		expect(result).not.toContain('канал');
	});

	it('ranks a word-id match above a translation-only match', () => {
		const words = [
			mkWord({ id: 'кава', translations: [{ id: 1, translation: 'кавалёк', comment: null, likes: 0 }] }),
			mkWord({ id: 'далёка', translations: [{ id: 2, translation: 'некавалёк', comment: null, likes: 0 }] }),
		];
		const result = findSimilarWords(words, 'кавали');
		// The word whose id is similar ("кава") outranks the one matching only
		// via a translation ("далёка" → "некавалёк").
		expect(result[0].word.id).toBe('кава');
	});

	it('filters out words with no real shared run of characters', () => {
		const words = [mkWord({ id: 'накапленне' }), mkWord({ id: 'ўваход' }), mkWord({ id: 'замок' })];
		const result = findSimilarWords(words, 'накоплены');
		expect(result.map((s) => s.word.id)).toContain('накапленне');
		expect(result.map((s) => s.word.id)).not.toContain('замок');
	});

	// Regression: only root-sharing words are "did you mean". "Накапленне" shares
	// the накап-/накоп- root; "Схоплена" shares only a long mid/suffix run
	// ("плены") and "Аддалены (прыметнік)" a short suffix run ("-лены") — neither
	// has the root in common, so both must be excluded.
	it('keeps only a root-overlap word, drops mid/suffix-overlap words', () => {
		const words = [
			mkWord({ id: 'Накапленне, зберажэнне' }),
			mkWord({ id: 'Схоплена' }),
			mkWord({ id: 'Аддалены (прыметнік)' }),
		];
		const result = findSimilarWords(words, 'накоплены');
		const ids = result.map((s) => s.word.id);
		expect(ids).toEqual(['Накапленне, зберажэнне']);
	});

	// Regression: an unrelated word only sharing a stray character or two
	// with the query must not be surfaced.
	it('does not suggest an unrelated word that only shares a short overlap', () => {
		const words = [mkWord({ id: 'Ніводны' }), mkWord({ id: 'Накапленне' })];
		const result = findSimilarWords(words, 'накоплены');
		expect(result.map((s) => s.word.id)).not.toContain('Ніводны');
		expect(result.map((s) => s.word.id)).toContain('Накапленне');
	});

	// Regression: a candidate matching more of the query must rank above one that
	// merely shares the root. All three share the "прада" root, but the exact
	// "прадаўжаць" (the query's first term, modulo the typo'd suffix) matches all
	// its leading chars, so it must float to the top rather than tie on the root.
	it('ranks a near-identical match above words that only share the root', () => {
		const words = [
			mkWord({ id: 'Прадастаўляць' }),
			mkWord({ id: 'Прадаўжаць (працягваць), прадаўжальнік' }),
			mkWord({ id: 'Перакладчык, падпісчык, прадаўшчык' }),
		];
		const result = findSimilarWords(words, 'Прадаўжаць (працягваць), прадаўжальнікккк');
		expect(result[0].word.id).toBe('Прадаўжаць (працягваць), прадаўжальнік');
	});

	// The query is split into terms; each is compared independently. Words that
	// share a root with ANY term surface — so "прадаўшчык" (root "прадаў" matches
	// the first term) appears, but ranks below the near-identical match.
	it('finds words sharing a root with any term, not just the first', () => {
		const words = [
			mkWord({ id: 'Прадастаўляць' }),
			mkWord({ id: 'Прадаўжаць (працягваць), прадаўжальнік' }),
			mkWord({ id: 'Перакладчык, падпісчык, прадаўшчык' }),
		];
		const result = findSimilarWords(words, 'Прадаўжаць (працягваць), прадаўжальнікккк');
		expect(result.map((s) => s.word.id)).toContain('Перакладчык, падпісчык, прадаўшчык');
	});

	// Term splitting: "тэст, крушэнне" must find "Крушэнне, крах" via the second
	// term, just as "крушэнне, тэст" finds it via the first.
	it('finds a word when the matching term is not first in the query', () => {
		const words = [mkWord({ id: 'Крушэнне, крах' }), mkWord({ id: 'Дом' })];
		const resultA = findSimilarWords(words, 'крушэнне, тэст');
		const resultB = findSimilarWords(words, 'тэст, крушэнне');
		expect(resultA.map((s) => s.word.id)).toContain('Крушэнне, крах');
		expect(resultB.map((s) => s.word.id)).toContain('Крушэнне, крах');
	});

	// Regression: entries whose id is a comma-separated list ("Капіць,
	// накапліваць, зберагаць") are recognized when any single component shares the
	// query's root ("накапліваць" shares the накап-/накоп- root with "накоплены").
	it('suggests a multi-word id when any component shares the root with the query', () => {
		const words = [
			mkWord({ id: 'Капіць, накапліваць, зберагаць' }),
			mkWord({ id: 'Ніводны' }),
			mkWord({ id: 'Далягляд, вобласьць' }),
		];
		const result = findSimilarWords(words, 'накоплены');
		expect(result.map((s) => s.word.id)).toContain('Капіць, накапліваць, зберагаць');
		expect(result.map((s) => s.word.id)).not.toContain('Ніводны');
		expect(result.map((s) => s.word.id)).not.toContain('Далягляд, вобласьць');
	});

	// Regression (the main noise bug): on real data, "накоплены" surfaced ~30
	// strangers that merely shared a common suffix ("-лен"/"-плен") — e.g.
	// "Маленькі" shares "лен", "Азлоблены" shares "плены". None share the query's
	// root, so they must be excluded. Meanwhile the genuinely similar "накоплены"
	// → "накапліваць" pairing shares the накап-/накоп- root (differing only at the
	// а/о vowel), which the tolerant root comparison must catch even when the root
	// is buried in a comma-separated id.
	it('surfaces a word whose buried component shares the root, but excludes suffix-sharers', () => {
		const words = [
			mkWord({ id: 'Капіць, накапліваць, зберагаць' }),
			mkWord({ id: 'Накапленне, зберажэнне' }),
			mkWord({ id: 'Маленькі' }),
			mkWord({ id: 'Азлоблены' }),
		];
		const result = findSimilarWords(words, 'накоплены');
		const ids = result.map((s) => s.word.id);
		expect(ids).toContain('Капіць, накапліваць, зберагаць');
		expect(ids).toContain('Накапленне, зберажэнне');
		expect(ids).not.toContain('Маленькі');
		expect(ids).not.toContain('Азлоблены');
	});

	it('returns all similar words, with no fixed cap', () => {
		const words = [
			mkWord({ id: 'накапленне' }),
			mkWord({ id: 'накапліваць' }),
			mkWord({ id: 'накапіць' }),
			mkWord({ id: 'накапляць' }),
		];
		const result = findSimilarWords(words, 'накап');
		// All four share a long run with the query; none is dropped by a limit.
		expect(result.length).toBe(4);
	});

	it('does not mutate the input array', () => {
		const words = [mkWord({ id: 'ааа' }), mkWord({ id: 'ааb' })];
		const copy = [...words];
		findSimilarWords(words, 'ааб');
		expect(words).toEqual(copy);
	});

	// Crossref translations ("гл. X", "параўн. Y") are pointers, not real
	// translations. They should NOT cause a word to appear in "did you mean"
	// results, even though the literal matcher shows them for exact results.
	it('skips crossref translations (гл./параўн.) when suggesting', () => {
		const words = [
			mkWord({
				id: 'Дом',
				translations: [{ id: 1, translation: 'параўн. Крушэнне', comment: null, likes: 0 }],
			}),
			mkWord({ id: 'Крушэнне' }),
		];
		const result = findSimilarWords(words, 'крушенне');
		// "Дом" only matches via a crossref — it must not surface.
		expect(result.map((s) => s.word.id)).not.toContain('Дом');
		expect(result.map((s) => s.word.id)).toContain('Крушэнне');
	});
});

describe('sortWords', () => {
	const words = [
		mkWord({ id: 'б', likes: 5, created_at: '2024-01-02', importance: { id: 1, name: 'x', level: 2 } }),
		mkWord({ id: 'а', likes: 10, created_at: '2024-01-03', importance: { id: 2, name: 'y', level: 1 } }),
		mkWord({ id: 'в', likes: 1, created_at: null, importance: { id: 3, name: 'z', level: null } }),
	];

	// Word-boundary fallback: the target root doesn't have to be at position 0.
	// "бекрушенне" contains "крушенне" starting at position 2 — the word's root
	// appears inside the query, so it must be surfaced.
	it('finds a word whose root appears inside a prefixed query', () => {
		const words = [mkWord({ id: 'Крушэнне, крах' }), mkWord({ id: 'Дом' })];
		const result = findSimilarWords(words, 'бекрушэнне');
		expect(result.map((s) => s.word.id)).toContain('Крушэнне, крах');
	});

	// Words sharing a root ("працаўляць" and "працаўленне" both start with
	// "працаўл") are genuinely related — the algorithm correctly finds them.
	it('finds words that share a root via leading-window match', () => {
		const words = [mkWord({ id: 'Працаўленне' }), mkWord({ id: 'Працаўляць' })];
		const result = findSimilarWords(words, 'працаўленне');
		expect(result.map((s) => s.word.id)).toContain('Працаўленне');
		expect(result.map((s) => s.word.id)).toContain('Працаўляць');
	});

	it('sorts by word asc and desc with id tiebreak', () => {
		expect(sortWords(words, 'word', 'asc').map((w) => w.id)).toEqual(['а', 'б', 'в']);
		expect(sortWords(words, 'word', 'desc').map((w) => w.id)).toEqual(['в', 'б', 'а']);
	});

	it('sorts by the Belarusian alphabet (і between з and й, before я)', () => {
		const bel = [mkWord({ id: 'яблык' }), mkWord({ id: 'ісці' }), mkWord({ id: 'згода' }), mkWord({ id: 'й' })];
		expect(sortWords(bel, 'word', 'asc').map((w) => w.id)).toEqual(['згода', 'ісці', 'й', 'яблык']);
		expect(sortWords(bel, 'word', 'desc').map((w) => w.id)).toEqual(['яблык', 'й', 'ісці', 'згода']);
	});

	it('sorts by likes in both directions', () => {
		expect(sortWords(words, 'likes', 'asc').map((w) => w.id)).toEqual(['в', 'б', 'а']);
		expect(sortWords(words, 'likes', 'desc').map((w) => w.id)).toEqual(['а', 'б', 'в']);
	});

	it('sorts by created_at, treating null dates as earliest', () => {
		expect(sortWords(words, 'created_at', 'asc').map((w) => w.id)).toEqual(['в', 'б', 'а']);
		expect(sortWords(words, 'created_at', 'desc').map((w) => w.id)).toEqual(['а', 'б', 'в']);
	});

	it('sorts by importance level, treating null level as 0', () => {
		expect(sortWords(words, 'importance', 'asc').map((w) => w.id)).toEqual(['в', 'а', 'б']);
		expect(sortWords(words, 'importance', 'desc').map((w) => w.id)).toEqual(['б', 'а', 'в']);
	});

	it('does not mutate the input array', () => {
		const copy = [...words];
		sortWords(words, 'likes', 'desc');
		expect(words).toEqual(copy);
	});
});

describe('rootRangesOf + highlightRanges', () => {
	// "накапліваць" shares the накап-/накоп- root (а↔о) with "накоплены" —
	// the exact component that makes this id a "did you mean" suggestion.
	it('points at the buried component whose root matched', () => {
		const ranges = rootRangesOf('Капіць, накапліваць, зберагаць', 'накоплены');
		expect(ranges.length).toBe(1);
		expect('Капіць, накапліваць, зберагаць'.slice(...ranges[0])).toBe('накапліваць'.slice(0, 6));
	});

	it('renders only the matched root, not the whole component', () => {
		const html = highlightRanges(
			'Капіць, накапліваць, зберагаць',
			rootRangesOf('Капіць, накапліваць, зберагаць', 'накоплены'),
		);
		expect(html).toBe('Капіць, <mark>накапл</mark>іваць, зберагаць');
	});

	it('returns nothing when no component shares the root', () => {
		expect(rootRangesOf('Азлоблены', 'накоплены')).toEqual([]);
		expect(highlightRanges('Азлоблены', [])).toBe('Азлоблены');
	});

	it('handles stress marks without disturbing the range mapping', () => {
		const text = 'лі́тара'; // stress on і
		const ranges = rootRangesOf(text, 'літар');
		expect(ranges.length).toBe(1);
		const html = highlightRanges(text, ranges);
		expect(html).toBe('<mark>лі́тар</mark>а');
	});

	it('keeps an apostrophe inside the marked root', () => {
		const html = highlightRanges('аб’ява, накапліваць', rootRangesOf('аб’ява, накапліваць', 'накоплены'));
		expect(html).toContain('<mark>накапл</mark>іваць');
	});

	// The root can live in a translation rather than the id: "накапліваць" only
	// matches "накоплены" through the translation's накап-/накоп- root, so the
	// highlight must land inside the translation (the very thing that caused the
	// suggestion to surface), not the id.
	it('highlights the root in the translation when the id does not share it', () => {
		expect(rootRangesOf('Зберажэнне', 'накоплены')).toEqual([]);
		const html = highlightRanges('накапліваць, накоплены', rootRangesOf('накапліваць, накоплены', 'накоплены'));
		expect(html).toBe('<mark>накапл</mark>іваць, <mark>накоплены</mark>');
	});
});
