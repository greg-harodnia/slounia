import { describe, it, expect } from 'vitest';
import { cyrToLat, latToCyr, propagateSoftness } from '../lacinka';

// Round-trip helper: cyr → lat → cyr (stress and apostrophe may diverge)
function roundtrip(cyr: string): string {
	return latToCyr(cyrToLat(cyr));
}

describe('cyrToLat', () => {
	it('converts simple letters', () => {
		const pairs = [
			['а', 'a'],
			['б', 'b'],
			['в', 'v'],
			['г', 'h'],
			['ґ', 'g'],
			['д', 'd'],
			['ж', 'ž'],
			['з', 'z'],
			['і', 'i'],
			['й', 'j'],
			['к', 'k'],
			['л', 'ł'],
			['м', 'm'],
			['н', 'n'],
			['о', 'o'],
			['п', 'p'],
			['р', 'r'],
			['с', 's'],
			['т', 't'],
			['у', 'u'],
			['ў', 'ŭ'],
			['ф', 'f'],
			['х', 'ch'],
			['ц', 'c'],
			['ч', 'č'],
			['ш', 'š'],
			['ы', 'y'],
			['э', 'e'],
		];
		for (const [cyr, lat] of pairs) expect(cyrToLat(cyr)).toBe(lat);
	});

	it('uppercase simple letters', () => {
		expect(cyrToLat('А')).toBe('A');
		expect(cyrToLat('Ж')).toBe('Ž');
		expect(cyrToLat('Ў')).toBe('Ŭ');
		expect(cyrToLat('Х')).toBe('Ch');
		expect(cyrToLat('Ш')).toBe('Š');
	});

	it('iotation at word start: j-prefix', () => {
		expect(cyrToLat('е')).toBe('je');
		expect(cyrToLat('ё')).toBe('jo');
		expect(cyrToLat('ю')).toBe('ju');
		expect(cyrToLat('я')).toBe('ja');
	});

	it('iotation with uppercase at word start', () => {
		expect(cyrToLat('Е')).toBe('Je');
		expect(cyrToLat('Ё')).toBe('Jo');
		expect(cyrToLat('Ю')).toBe('Ju');
		expect(cyrToLat('Я')).toBe('Ja');
	});

	it('iotation after vowel: j-prefix', () => {
		expect(cyrToLat('ае')).toBe('aje');
		expect(cyrToLat('аё')).toBe('ajo');
		expect(cyrToLat('аю')).toBe('aju');
		expect(cyrToLat('ая')).toBe('aja');
	});

	it('iotation after apostrophe', () => {
		expect(cyrToLat("з'е")).toBe('zje');
		expect(cyrToLat('зʼе')).toBe('zje');
		expect(cyrToLat("б'ю")).toBe('bju');
		expect(cyrToLat('вʼя')).toBe('vja');
	});

	it('iotation after soft sign (ь): precedes жe → softens + je', () => {
		expect(cyrToLat('лье')).toBe('lje');
		expect(cyrToLat('сья')).toBe('śja');
	});

	it('iotation after non-letter character', () => {
		expect(cyrToLat('1е')).toBe('1je');
		expect(cyrToLat('-я')).toBe('-ja');
	});

	it('iotation after consonant: ie prefix', () => {
		expect(cyrToLat('се')).toBe('sie');
		expect(cyrToLat('ве')).toBe('vie');
		expect(cyrToLat('не')).toBe('nie');
		expect(cyrToLat('ме')).toBe('mie');
	});

	it('hard Л before non-soft vowels', () => {
		expect(cyrToLat('ла')).toBe('ła');
		expect(cyrToLat('лу')).toBe('łu');
		expect(cyrToLat('ло')).toBe('ło');
		expect(cyrToLat('лэ')).toBe('łe');
		expect(cyrToLat('лы')).toBe('ły');
	});

	it('soft Л before soft vowels', () => {
		expect(cyrToLat('ля')).toBe('la');
		expect(cyrToLat('лю')).toBe('lu');
		expect(cyrToLat('лё')).toBe('lo');
		expect(cyrToLat('ле')).toBe('le');
		expect(cyrToLat('лі')).toBe('li');
	});

	it('soft Л before ь', () => {
		expect(cyrToLat('ль')).toBe('l');
	});

	it('soft Л triggers skipIPrefix for following iotated vowel only once', () => {
		expect(cyrToLat('ляя')).toBe('laja');
		expect(cyrToLat('люю')).toBe('luju');
		expect(cyrToLat('лёё')).toBe('lojo');
		expect(cyrToLat('лее')).toBe('leje');
	});

	it('Ь softens preceding consonant', () => {
		expect(cyrToLat('ць')).toBe('ć');
		expect(cyrToLat('сь')).toBe('ś');
		expect(cyrToLat('зь')).toBe('ź');
		expect(cyrToLat('нь')).toBe('ń');
		expect(cyrToLat('ль')).toBe('l');
	});

	it('Дзь → Dź (title-case), дзь → dź (lowercase)', () => {
		expect(cyrToLat('дзь')).toBe('dź');
		expect(cyrToLat('Дзь')).toBe('Dź');
	});

	it('stress on single letter', () => {
		expect(cyrToLat('а́')).toBe('a\u0301');
	});

	it('stress on word: U+0301 on last Latin char of stressed syllable', () => {
		expect(cyrToLat('ка́ва')).toBe('ka\u0301va');
	});

	it('stress on iotated vowel', () => {
		expect(cyrToLat('я́')).toBe('ja\u0301');
		expect(cyrToLat('е́')).toBe('je\u0301');
	});

	it('stress on multi-char mapping (ш→š)', () => {
		expect(cyrToLat('шо́у')).toBe('šo\u0301u');
	});

	it('stress on iotated vowel after consonant', () => {
		expect(cyrToLat('не́')).toBe('nie\u0301');
	});

	it('stress on soft л', () => {
		expect(cyrToLat('ля́')).toBe('la\u0301');
	});

	it('stress with ь softener (зень → zień)', () => {
		expect(cyrToLat('зе́нь')).toBe('zie\u0301ń');
	});

	it('multiple stresses in one word', () => {
		expect(cyrToLat('а́е́')).toBe('a\u0301je\u0301');
	});

	it('stress on дзь → dź', () => {
		expect(cyrToLat('дзьо́')).toBe('dźo\u0301');
	});

	it('empty string', () => {
		expect(cyrToLat('')).toBe('');
	});

	it('concrete words', () => {
		expect(cyrToLat('прывітанне')).toBe('pryvitannie');
		expect(cyrToLat('кава')).toBe('kava');
		expect(cyrToLat('Магілёў')).toBe('Mahiloŭ');
		expect(cyrToLat('Лацінка')).toBe('Łacinka');
		expect(cyrToLat('пя́ць')).toBe('pia\u0301ć');
	});
});

describe('latToCyr', () => {
	it('converts simple letters', () => {
		const pairs: [string, string][] = [
			['a', 'а'],
			['b', 'б'],
			['v', 'в'],
			['h', 'г'],
			['g', 'ґ'],
			['d', 'д'],
			['ž', 'ж'],
			['z', 'з'],
			['i', 'і'],
			['j', 'й'],
			['k', 'к'],
			['ł', 'л'],
			['m', 'м'],
			['n', 'н'],
			['o', 'о'],
			['p', 'п'],
			['r', 'р'],
			['s', 'с'],
			['t', 'т'],
			['u', 'у'],
			['ŭ', 'ў'],
			['f', 'ф'],
			['c', 'ц'],
			['č', 'ч'],
			['š', 'ш'],
			['y', 'ы'],
			['e', 'е'],
		];
		for (const [lat, cyr] of pairs) expect(latToCyr(lat)).toBe(cyr);
	});

	it('uppercase simple letters', () => {
		expect(latToCyr('A')).toBe('А');
		expect(latToCyr('Ž')).toBe('Ж');
		expect(latToCyr('Ŭ')).toBe('Ў');
		expect(latToCyr('Š')).toBe('Ш');
	});

	it('digraphs', () => {
		expect(latToCyr('ch')).toBe('х');
		expect(latToCyr('cz')).toBe('ч');
		expect(latToCyr('sz')).toBe('ш');
		expect(latToCyr('rz')).toBe('ж');
		expect(latToCyr('Ch')).toBe('Х');
		expect(latToCyr('CZ')).toBe('Ч');
	});

	it('iotation: j+vowel', () => {
		expect(latToCyr('ja')).toBe('я');
		expect(latToCyr('je')).toBe('е');
		expect(latToCyr('jo')).toBe('ё');
		expect(latToCyr('ju')).toBe('ю');
	});

	it('ji iotation', () => {
		expect(latToCyr('ji')).toBe('і');
	});

	it('uppercase iotation: vowel case determines Cyrillic case', () => {
		expect(latToCyr('JA')).toBe('Я');
		expect(latToCyr('Ja')).toBe('я');
		expect(latToCyr('jA')).toBe('Я');
	});

	it('post-consonant iotation: i+vowel', () => {
		expect(latToCyr('pia')).toBe('пя');
		expect(latToCyr('pie')).toBe('пе');
		expect(latToCyr('pio')).toBe('пё');
		expect(latToCyr('piu')).toBe('пю');
	});

	it('soft consonants', () => {
		expect(latToCyr('ć')).toBe('ць');
		expect(latToCyr('ś')).toBe('сь');
		expect(latToCyr('ź')).toBe('зь');
		expect(latToCyr('ń')).toBe('нь');
	});

	it('caron letters', () => {
		expect(latToCyr('č')).toBe('ч');
		expect(latToCyr('š')).toBe('ш');
		expect(latToCyr('ž')).toBe('ж');
		expect(latToCyr('ŭ')).toBe('ў');
	});

	it('ł→л', () => {
		expect(latToCyr('ł')).toBe('л');
	});

	it('l before vowel → ль + iotated vowel', () => {
		expect(latToCyr('la')).toBe('ля');
		expect(latToCyr('le')).toBe('ле');
		expect(latToCyr('lo')).toBe('лё');
		expect(latToCyr('lu')).toBe('лю');
	});

	it('l before y → лы', () => {
		expect(latToCyr('ly')).toBe('лы');
	});

	it('l before i → лі', () => {
		expect(latToCyr('li')).toBe('лі');
	});

	it('l before consonant → ль', () => {
		expect(latToCyr('ld')).toBe('льд');
	});

	it('e→е (default)', () => {
		expect(latToCyr('e')).toBe('е');
	});

	it('w→ў', () => {
		expect(latToCyr('w')).toBe('ў');
	});

	it('j→й', () => {
		expect(latToCyr('j')).toBe('й');
	});

	it('stress preserved', () => {
		expect(latToCyr('ka\u0301va')).toBe('ка\u0301ва');
		expect(latToCyr('ša\u0301pka')).toBe('ша\u0301пка');
		expect(latToCyr('ja\u0301')).toBe('я\u0301');
		expect(latToCyr('pia\u0301ć')).toBe('пя\u0301ць');
	});

	it('empty string', () => {
		expect(latToCyr('')).toBe('');
	});

	it('concrete words', () => {
		expect(latToCyr('kava')).toBe('кава');
		expect(latToCyr('pryvitannie')).toBe('прывітанне');
	});

	it('nnie → ньне (post-latToCyr replacement)', () => {
		expect(latToCyr('abviaszczennie').replace(/нне/g, 'ньне')).toBe('абвяшченне'.replace(/нне/g, 'ньне'));
		expect(latToCyr('abviaszczenie').replace(/нне/g, 'ньне')).toBe('абвяшчене');
		expect(latToCyr('pryvitannie').replace(/нне/g, 'ньне')).toBe('прывітанне'.replace(/нне/g, 'ньне'));
	});

	it('replace does nothing when no нне in latToCyr output', () => {
		expect(latToCyr('kava').replace(/нне/g, 'ньне')).toBe('кава');
	});
});

describe('propagateSoftness', () => {
	it('s + labial + soft vowel: dasviedczany → дасьведчаны', () => {
		expect(propagateSoftness(latToCyr('dasviedczany'))).toBe('дасьведчаны');
	});

	it('z + labial + soft vowel: zviazny → зьвязны', () => {
		expect(propagateSoftness(latToCyr('zviazny'))).toBe('зьвязны');
	});

	it('c + labial + soft vowel: svietacz → сьветач', () => {
		expect(propagateSoftness(latToCyr('svietacz'))).toBe('сьветач');
	});

	it('does not affect words without soft context', () => {
		expect(propagateSoftness(latToCyr('kava'))).toBe('кава');
		expect(propagateSoftness(latToCyr('stol'))).toBe('стол');
	});

	it('does not over-soften when consonant is directly before soft vowel', () => {
		expect(propagateSoftness(latToCyr('dzieci'))).toBe('дзеці');
		expect(propagateSoftness(latToCyr('cienisty'))).toBe('ценісты');
		expect(propagateSoftness(latToCyr('siena'))).toBe('сена');
	});

	it('с/з before н/л + soft vowel: snieh → сьнег', () => {
		expect(propagateSoftness(latToCyr('snieh'))).toBe('сьнег');
	});

	it('с/з before н/л + soft vowel: zlenny → зьленны', () => {
		expect(propagateSoftness(latToCyr('zlenny'))).toBe('зьленны');
	});

	it('с/з before ц + soft vowel: sciana → сьцяна', () => {
		expect(propagateSoftness(latToCyr('sciana'))).toBe('сьцяна');
	});

	it('с/з before ц + soft vowel: zcialny → зьцяльны', () => {
		expect(propagateSoftness(latToCyr('zcialny'))).toBe('зьцяльны');
	});

	it('does not affect words without soft context', () => {
		expect(propagateSoftness(latToCyr('kava'))).toBe('кава');
		expect(propagateSoftness(latToCyr('stol'))).toBe('стол');
	});

	it('does not over-soften when consonant is directly before soft vowel', () => {
		expect(propagateSoftness(latToCyr('dzieci'))).toBe('дзеці');
		expect(propagateSoftness(latToCyr('cienisty'))).toBe('ценісты');
		expect(propagateSoftness(latToCyr('siena'))).toBe('сена');
	});

	it('idempotent — applying twice is the same', () => {
		const once = propagateSoftness(latToCyr('dasviedczany'));
		expect(propagateSoftness(once)).toBe(once);
	});
});

describe('cyrToLat ↔ latToCyr roundtrip', () => {
	it('simple word', () => {
		expect(roundtrip('кава')).toBe('кава');
	});

	it('word with iotation', () => {
		expect(roundtrip('прывітанне')).toBe('прывітанне');
	});

	it('word with ь', () => {
		expect(roundtrip('пяць')).toBe('пяць');
	});

	it('word with дзь', () => {
		expect(roundtrip('дзьмуць')).toBe('дзьмуць');
	});

	it('word with hard Л', () => {
		expect(roundtrip('лаўка')).toBe('лаўка');
	});

	it('word with soft Л', () => {
		expect(roundtrip('ляля')).toBe('ляля');
	});

	it('word with stress', () => {
		expect(roundtrip('ка́ва')).toBe('ка́ва');
	});

	it('word with stress on iotated vowel', () => {
		expect(roundtrip('ма́я')).toBe('ма́я');
	});

	it('word with stress and ь', () => {
		expect(roundtrip('пя́ць')).toBe('пя́ць');
	});

	it('word with hard Л and stress', () => {
		expect(roundtrip('ла́ўка')).toBe('ла́ўка');
	});

	it('empty string', () => {
		expect(roundtrip('')).toBe('');
	});

	it('word with only consonants', () => {
		expect(roundtrip('бжд')).toBe('бжд');
	});
});
