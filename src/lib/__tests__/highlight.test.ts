import { describe, it, expect } from 'vitest';
import { highlightText } from '../highlight';
import { cyrToLat, latToCyr } from '../lacinka';

describe('highlightText', () => {
	it('returns escaped text when query is empty', () => {
		expect(highlightText('кава', '')).toBe('кава');
		expect(highlightText('кава', '  ')).toBe('кава');
	});

	it('wraps matching substring in <mark>', () => {
		expect(highlightText('прывітанне', 'віт')).toBe('пры<mark>віт</mark>анне');
	});

	it('matches multiple terms', () => {
		expect(highlightText('прывітанне свет', 'віт свет')).toBe('пры<mark>віт</mark>анне <mark>свет</mark>');
	});

	it('preserves U+0301 inside match', () => {
		expect(highlightText('ка́ва', 'кава')).toBe('<mark>ка\u0301ва</mark>');
	});

	it('U+0301 at end of match region', () => {
		expect(highlightText('віта́ць', 'віта')).toBe('<mark>віта\u0301</mark>ць');
	});

	it('U+0301 before match region', () => {
		expect(highlightText('а́вія', 'вія')).toBe('а\u0301<mark>вія</mark>');
	});

	it('U+0301 after match region', () => {
		expect(highlightText('авія́', 'аві')).toBe('<mark>аві</mark>я\u0301');
	});

	it('U+0301 in middle of match with unmatched trailing', () => {
		expect(highlightText('аві́я', 'ві')).toBe('а<mark>ві\u0301</mark>я');
	});

	it('U+0301 at start of match', () => {
		expect(highlightText('а́ві', 'а')).toBe('<mark>а\u0301</mark>ві');
	});

	it('escapes apostrophe and wraps match', () => {
		expect(highlightText("аб'ява", 'абя')).toBe('<mark>аб&#039;я</mark>ва');
	});

	it('matches right apostrophe in text', () => {
		expect(highlightText('абʼява', 'абя')).toBe('<mark>абʼя</mark>ва');
	});

	it('escapes regex special chars in query', () => {
		expect(highlightText('a+b', 'a+b')).toBe('<mark>a+b</mark>');
		expect(highlightText('a.b', 'a.b')).toBe('<mark>a.b</mark>');
		expect(highlightText('a*b', 'a*b')).toBe('<mark>a*b</mark>');
		expect(highlightText('a(b', 'a(b')).toBe('<mark>a(b</mark>');
	});

	it('escapes HTML special chars in text', () => {
		expect(highlightText('a<b', 'a')).toBe('<mark>a</mark>&lt;b');
		expect(highlightText('a>b', 'a')).toBe('<mark>a</mark>&gt;b');
		expect(highlightText('a&b', 'a')).toBe('<mark>a</mark>&amp;b');
	});

	it('merges adjacent matches into one <mark>', () => {
		expect(highlightText('нанана', 'на')).toBe('<mark>нанана</mark>');
	});

	it('matches at start of text', () => {
		expect(highlightText('прывітанне', 'пры')).toBe('<mark>пры</mark>вітанне');
	});

	it('matches at end of text', () => {
		expect(highlightText('прывітанне', 'нне')).toBe('прывіта<mark>нне</mark>');
	});

	it('handles no match', () => {
		expect(highlightText('кава', 'гарбата')).toBe('кава');
	});

	it('handles query longer than text', () => {
		expect(highlightText('ка', 'кава')).toBe('ка');
	});

	it('query ё matches е in text', () => {
		expect(highlightText('мед', 'мёд')).toBe('<mark>мед</mark>');
	});

	it('query е matches ё in text', () => {
		expect(highlightText('мёд', 'мед')).toBe('<mark>мёд</mark>');
	});

	it('query э matches е in text', () => {
		expect(highlightText('ехаць', 'эхаць')).toBe('<mark>ехаць</mark>');
	});

	it('query г matches ґ in text', () => {
		expect(highlightText('ґандаль', 'гандаль')).toBe('<mark>ґандаль</mark>');
	});

	it('query ґ matches г in text', () => {
		expect(highlightText('гандаль', 'ґандаль')).toBe('<mark>гандаль</mark>');
	});

	it('query у matches ў in text', () => {
		expect(highlightText('траўня', 'трауня')).toBe('<mark>траўня</mark>');
	});

	describe('cross-alphabet (word-header flow — Latin search, Cyrillic text)', () => {
		const wordHeaderHL = (wordId: string, search: string) => highlightText(wordId, latToCyr(search));

		it('full word match', () => {
			expect(wordHeaderHL('кава', 'kava')).toBe('<mark>кава</mark>');
		});
		it('partial match', () => {
			expect(wordHeaderHL('кава', 'kav')).toBe('<mark>кав</mark>а');
		});
		it('partial match with stress', () => {
			expect(wordHeaderHL('ка́ва', 'kava')).toBe('<mark>ка\u0301ва</mark>');
		});
		it('stress at boundary', () => {
			expect(wordHeaderHL('кава́', 'kava')).toBe('<mark>кава\u0301</mark>');
		});
		it('lacinka→cyrillic roundtrip (pryvitannie)', () => {
			expect(wordHeaderHL('прывітанне', 'pryvitannie')).toBe('<mark>прывітанне</mark>');
		});
		it('partial via lacinka (vitannie→вітанне)', () => {
			expect(wordHeaderHL('прывітанне', 'vitannie')).toBe('пры<mark>вітанне</mark>');
		});
	});

	describe('cross-alphabet (Latin display mode — Cyrillic search, Latin text)', () => {
		const cyrNorm = (s: string) => s.replace(/ё/g, 'е').replace(/э/g, 'е').replace(/ў/g, 'у');
		const latHL = (translation: string, searchQuery: string) =>
			highlightText(
				cyrToLat(translation),
				cyrToLat(cyrNorm(latToCyr(searchQuery))),
				cyrToLat(cyrNorm(translation)),
			);
		const latHLnoMatch = (translation: string, searchQuery: string) =>
			highlightText(cyrToLat(translation), cyrToLat(cyrNorm(latToCyr(searchQuery))));

		it('full word match (cyrillic search on latin text)', () => {
			expect(latHL('прывітанне', 'прывітанне')).toBe('<mark>pryvitannie</mark>');
		});
		it('partial match', () => {
			expect(latHL('прывітанне', 'віта')).toBe('pry<mark>vita</mark>nnie');
		});
		it('partial match with stress', () => {
			expect(latHL('прывіта́нне', 'віта')).toBe('pry<mark>vita\u0301</mark>nnie');
		});
		it('matchText bridges cyrNorm divergence (мёд)', () => {
			// cyrToLat('мёд') → "miod", cyrToLat('мед') → "mied".
			// matchText "mied" aligns positions so search "mied" highlights "miod".
			expect(latHL('мёд', 'мёд')).toBe('<mark>miod</mark>');
		});
		it('without matchText, cyrNorm divergence loses highlight', () => {
			expect(latHLnoMatch('мёд', 'мёд')).toBe('miod');
		});
		it('latin search on latin text in latin mode (kava→кава→kava)', () => {
			expect(latHL('кава', 'kava')).toBe('<mark>kava</mark>');
		});
		it('stress preserved in latin mode', () => {
			expect(latHL('ка́ва', 'kava')).toBe('<mark>ka\u0301va</mark>');
			expect(latHL('зямля́', 'зямля')).toBe('<mark>ziamla\u0301</mark>');
		});
	});

	it('nnie→ньне via highlightQuery pipeline', () => {
		const query = latToCyr('abviaszczennie').replace(/нне/g, 'ньне');
		expect(highlightText('абвяшчэньне', query)).toBe('<mark>абвяшчэньне</mark>');
	});
});
