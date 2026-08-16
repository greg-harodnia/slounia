import { describe, it, expect } from 'vitest';
import { queryWords, sortWords } from '../word-search';
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

describe('sortWords', () => {
	const words = [
		mkWord({ id: 'б', likes: 5, created_at: '2024-01-02', importance: { id: 1, name: 'x', level: 2 } }),
		mkWord({ id: 'а', likes: 10, created_at: '2024-01-03', importance: { id: 2, name: 'y', level: 1 } }),
		mkWord({ id: 'в', likes: 1, created_at: null, importance: { id: 3, name: 'z', level: null } }),
	];

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
