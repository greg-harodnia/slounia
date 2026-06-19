import { describe, it, expect } from 'vitest';
import { normalizeText } from '../highlight';

describe('normalizeText', () => {
	it('strips U+0301 stress', () => {
		expect(normalizeText('ка́ва')).toBe('кава');
		expect(normalizeText('прывіта́нне')).toBe('прывітанне');
		expect(normalizeText('зямля́')).toBe('зямля');
	});

	it('normalises apostrophes to U+2019', () => {
		expect(normalizeText("аб'ява")).toBe('аб’ява');
		expect(normalizeText('абʼява')).toBe('аб’ява');
		expect(normalizeText('аб`ява')).toBe('аб’ява');
	});

	it('normalises ё→е', () => {
		expect(normalizeText('мёд')).toBe('мед');
		expect(normalizeText('ёлка')).toBe('елка');
	});

	it('normalises э→е', () => {
		expect(normalizeText('эхаць')).toBe('ехаць');
	});

	it('normalises и→і', () => {
		expect(normalizeText('мир')).toBe('мір');
	});

	it('normalises Latin i→і', () => {
		expect(normalizeText('minsk')).toBe('mіnsk');
	});

	it('normalises у→ў', () => {
		expect(normalizeText('у')).toBe('ў');
	});

	it('normalises г→ґ', () => {
		expect(normalizeText('гандаль')).toBe('ґандаль');
	});

	it('normalises ł→l', () => {
		expect(normalizeText('łacinka')).toBe('lacіnka');
	});

	it('normalises ŭ→u', () => {
		expect(normalizeText('ŭ')).toBe('u');
	});

	it('handles empty string', () => {
		expect(normalizeText('')).toBe('');
	});

	it('handles string with no normalisations needed', () => {
		expect(normalizeText('а')).toBe('а');
	});

	it('applies all transforms together', () => {
		expect(normalizeText("Прывіта́нне 'свет'")).toBe('прывітанне ’свет’');
	});

	describe('SQL sync', () => {
		// Reimplement the SQL normalize_text logic (from supabase-migration.sql):
		//   TRANSLATE(
		//     REPLACE(REPLACE(REPLACE(REPLACE(LOWER(s), '’', ''), CHR(39), ''), '`', ''), CHR(769), ''),
		//     'ёиiугэ',
		//     'еііўґе'
		//   )
		function sqlNormalizeText(s: string): string {
			return s
				.toLowerCase()
				.replace(/[\u0301’'`]/g, '')
				.replace(/ё/g, 'е')
				.replace(/и/g, 'і')
				.replace(/i/g, 'і')
				.replace(/у/g, 'ў')
				.replace(/г/g, 'ґ')
				.replace(/э/g, 'е');
		}

		it('matches SQL for plain Cyrillic (no ł/ŭ, no apostrophes)', () => {
			const cases = [
				'кава',
				'мёд',
				'ехаць',
				'ґандаль',
				'траўня',
				'прывітанне',
				'свет',
				'слова',
				'беларуская',
				'Прывітанне',
				'Мёд',
				'Кава',
				'ка́ва',
				'прывіта́нне',
				'зямля́',
			];
			for (const c of cases) {
				expect(normalizeText(c)).toBe(sqlNormalizeText(c));
			}
		});

		it('apostrophe divergence (SQL strips entirely, client keeps ’)', () => {
			const client = normalizeText("аб'ява");
			const sql = sqlNormalizeText("аб'ява");
			expect(client).toBe('аб’ява');
			expect(sql).toBe('абява');
			expect(client).not.toBe(sql);
		});

		it('ł→l and ŭ→u divergence (client does it, SQL does not)', () => {
			// ł/ŭ only appear in Latin text, handled client-side before SQL sees it.
			// SQL TRANSLATE also maps i→і, so only ł and ŭ diverge.
			const client = normalizeText('łacinka ŭ');
			const sql = sqlNormalizeText('łacinka ŭ');
			expect(client).toBe('lacіnka u');
			expect(sql).toBe('łacіnka ŭ');
		});
	});
});
