// cyrToLat: stress is embedded as U+0301 on the last Latin char of the
// Cyrillic char's representation (e.g. ш→š + U+0301, я→ja + U+0301).
// latToCyr: stress is auto-detected from U+0301 in input and forwarded.
// Both detect stress inline (U+0301 in the text).
const cyrToLatMap: Record<string, string> = {
	А: 'A',
	а: 'a',
	Б: 'B',
	б: 'b',
	В: 'V',
	в: 'v',
	Г: 'H',
	г: 'h',
	Ґ: 'G',
	ґ: 'g',
	Д: 'D',
	д: 'd',
	Ж: 'Ž',
	ж: 'ž',
	З: 'Z',
	з: 'z',
	І: 'I',
	і: 'i',
	Й: 'J',
	й: 'j',
	К: 'K',
	к: 'k',
	Л: 'Ł',
	л: 'ł',
	М: 'M',
	м: 'm',
	Н: 'N',
	н: 'n',
	О: 'O',
	о: 'o',
	П: 'P',
	п: 'p',
	Р: 'R',
	р: 'r',
	С: 'S',
	с: 's',
	Т: 'T',
	т: 't',
	У: 'U',
	у: 'u',
	Ў: 'Ŭ',
	ў: 'ŭ',
	Ф: 'F',
	ф: 'f',
	Х: 'Ch',
	х: 'ch',
	Ц: 'C',
	ц: 'c',
	Ч: 'Č',
	ч: 'č',
	Ш: 'Š',
	ш: 'š',
	Ы: 'Y',
	ы: 'y',
	Э: 'E',
	э: 'e',
};

const vowels = new Set('аеёіоуыэюяАЕЁІОУЫЭЮЯ');
const apostrophes = new Set(["'", 'ʼ', '’', '`']);

export function cyrToLat(text: string): string {
	const chars = [...text];
	const stressed = new Set<number>();
	const clean: string[] = [];
	for (let i = 0; i < chars.length; i++) {
		if (chars[i] === '\u0301') {
			if (clean.length > 0) stressed.add(clean.length - 1);
		} else {
			clean.push(chars[i]);
		}
	}

	const result: string[] = [];
	let skipIPrefix = false;

	for (let i = 0; i < clean.length; i++) {
		const ch = clean[i];
		const prev = i > 0 ? clean[i - 1] : null;
		const isStress = stressed.has(i);

		let latin: string;

		const jPrefix =
			i === 0 ||
			(prev != null && vowels.has(prev)) ||
			(prev != null && apostrophes.has(prev)) ||
			(prev != null && (prev === 'ь' || prev === 'Ь')) ||
			(prev != null && !/[а-яёА-ЯЁa-zA-Z]/.test(prev));

		switch (ch) {
			case 'Е':
				latin = jPrefix ? 'Je' : skipIPrefix ? 'E' : 'Ie';
				skipIPrefix = false;
				break;
			case 'е':
				latin = jPrefix ? 'je' : skipIPrefix ? 'e' : 'ie';
				skipIPrefix = false;
				break;
			case 'Ё':
				latin = jPrefix ? 'Jo' : skipIPrefix ? 'O' : 'Io';
				skipIPrefix = false;
				break;
			case 'ё':
				latin = jPrefix ? 'jo' : skipIPrefix ? 'o' : 'io';
				skipIPrefix = false;
				break;
			case 'Ю':
				latin = jPrefix ? 'Ju' : skipIPrefix ? 'U' : 'Iu';
				skipIPrefix = false;
				break;
			case 'ю':
				latin = jPrefix ? 'ju' : skipIPrefix ? 'u' : 'iu';
				skipIPrefix = false;
				break;
			case 'Я':
				latin = jPrefix ? 'Ja' : skipIPrefix ? 'A' : 'Ia';
				skipIPrefix = false;
				break;
			case 'я':
				latin = jPrefix ? 'ja' : skipIPrefix ? 'a' : 'ia';
				skipIPrefix = false;
				break;
			case 'Ь':
			case 'ь': {
				const prev1 = result[result.length - 1];
				const prev2 = result.length > 1 ? result[result.length - 2] : null;
				if (prev2 && (prev2 === 'd' || prev2 === 'D') && (prev1 === 'z' || prev1 === 'Z')) {
					result[result.length - 1] = prev1 === 'z' ? 'ź' : 'Ź';
					continue;
				}
				if (prev1 === 'c') {
					result[result.length - 1] = 'ć';
					continue;
				}
				if (prev1 === 'C') {
					result[result.length - 1] = 'Ć';
					continue;
				}
				if (prev1 === 's') {
					result[result.length - 1] = 'ś';
					continue;
				}
				if (prev1 === 'S') {
					result[result.length - 1] = 'Ś';
					continue;
				}
				if (prev1 === 'z') {
					result[result.length - 1] = 'ź';
					continue;
				}
				if (prev1 === 'Z') {
					result[result.length - 1] = 'Ź';
					continue;
				}
				if (prev1 === 'n') {
					result[result.length - 1] = 'ń';
					continue;
				}
				if (prev1 === 'N') {
					result[result.length - 1] = 'Ń';
					continue;
				}
				if (prev1 === 'l' || prev1 === 'L') {
					continue;
				}
				if (prev1 === 'ł') {
					result[result.length - 1] = 'l';
					continue;
				}
				if (prev1 === 'Ł') {
					result[result.length - 1] = 'L';
					continue;
				}
				continue;
			}
			case 'л':
			case 'Л': {
				const next = clean[i + 1];
				const upper = ch === 'Л';
				if (next != null && 'еёіюяЕЁІЮЯьЬ'.includes(next)) {
					latin = upper ? 'L' : 'l';
					if (next != null && 'еёюяЕЁЮЯ'.includes(next)) {
						skipIPrefix = true;
					}
				} else {
					latin = upper ? 'Ł' : 'ł';
				}
				break;
			}
			default:
				if (apostrophes.has(ch)) {
					continue;
				}
				latin = cyrToLatMap[ch] ?? ch;
				break;
		}

		if (isStress) {
			const lChars = [...latin];
			lChars[lChars.length - 1] += '\u0301';
			latin = lChars.join('');
		}

		result.push(latin);
	}

	return result.join('');
}

const latVowelsLower = new Set('aeioóuy');
const latVowelsUpper = new Set('AEIOUY');

function isLatVowel(ch: string): boolean {
	return latVowelsLower.has(ch) || latVowelsUpper.has(ch);
}

export function latToCyr(text: string): string {
	// Process order matters: stress/apostrophe skip → digraphs (ch,cz,sz,rz)
	// → iotation (j+vowel) → soft consonants (ć,ś,ź,ń) → caron letters → ł/l
	// → e → w → j → simple map. Must consume multi-char sequences first so
	// single-char rules don't match their parts.
	const s = [...text];
	const out: string[] = [];
	let i = 0;

	function peek(n: number): string | undefined {
		return i + n < s.length ? s[i + n] : undefined;
	}
	function upper(ch: string): boolean {
		return ch.toUpperCase() === ch;
	}
	function cap(uc: string, lc: string): string {
		return upper(s[i]) ? uc : lc;
	}

	while (i < s.length) {
		const ch = s[i];
		const n1 = peek(1);

		if (ch === '\u0301' || apostrophes.has(ch)) {
			i++;
			continue;
		}

		// ---------- digraphs (2 Latin → 1 Cyrillic) ----------

		// ch
		if ((ch === 'c' || ch === 'C') && (n1 === 'h' || n1 === 'H')) {
			if (peek(2) === '\u0301') {
				out.push(cap('Х', 'х') + '\u0301');
				i += 3;
				continue;
			}
			out.push(cap('Х', 'х'));
			i += 2;
			continue;
		}

		// cz
		if ((ch === 'c' || ch === 'C') && (n1 === 'z' || n1 === 'Z')) {
			if (peek(2) === '\u0301') {
				out.push(cap('Ч', 'ч') + '\u0301');
				i += 3;
				continue;
			}
			out.push(cap('Ч', 'ч'));
			i += 2;
			continue;
		}

		// sz
		if ((ch === 's' || ch === 'S') && (n1 === 'z' || n1 === 'Z')) {
			if (peek(2) === '\u0301') {
				out.push(cap('Ш', 'ш') + '\u0301');
				i += 3;
				continue;
			}
			out.push(cap('Ш', 'ш'));
			i += 2;
			continue;
		}

		// rz
		if ((ch === 'r' || ch === 'R') && (n1 === 'z' || n1 === 'Z')) {
			if (peek(2) === '\u0301') {
				out.push(cap('Ж', 'ж') + '\u0301');
				i += 3;
				continue;
			}
			out.push(cap('Ж', 'ж'));
			i += 2;
			continue;
		}

		// ---------- iotation: j + vowel ----------
		if ((ch === 'j' || ch === 'J') && n1 != null && isLatVowel(n1)) {
			const vowelMap: Record<string, string> = {
				a: 'я',
				A: 'Я',
				e: 'е',
				E: 'Е',
				o: 'ё',
				O: 'Ё',
				u: 'ю',
				U: 'Ю',
				i: 'і',
				I: 'І',
			};
			const cyr = vowelMap[n1];
			if (cyr) {
				const upperCh = upper(ch);
				const upperN1 = upper(n1);
				const result = upperCh && !upperN1 ? cyr : upperCh ? cyr.toUpperCase() : cyr;
				if (peek(2) === '\u0301') {
					out.push(result + '\u0301');
					i += 3;
					continue;
				}
				out.push(result);
				i += 2;
				continue;
			}
		}

		// ---------- iotation after consonant: i + vowel (ia, ie, io, iu) ----------
		if ((ch === 'i' || ch === 'I') && n1 != null && 'aeouAEOU'.includes(n1)) {
			const vowelMap: Record<string, string> = {
				a: 'я',
				A: 'Я',
				e: 'е',
				E: 'Е',
				o: 'ё',
				O: 'Ё',
				u: 'ю',
				U: 'Ю',
			};
			const cyr = vowelMap[n1];
			if (cyr) {
				const upperN1 = upper(n1);
				const result = upper(ch) && !upperN1 ? cyr.toLowerCase() : upper(ch) ? cyr.toUpperCase() : cyr;
				if (peek(2) === '\u0301') {
					out.push(result + '\u0301');
					i += 3;
					continue;
				}
				out.push(result);
				i += 2;
				continue;
			}
		}

		// ---------- soft consonants: ć ś ź ń → ь + consonant ----------
		const softMap: Record<string, string> = {
			ć: 'ць',
			Ć: 'Ць',
			ś: 'сь',
			Ś: 'Сь',
			ź: 'зь',
			Ź: 'Зь',
			ń: 'нь',
			Ń: 'Нь',
		};
		const soft = softMap[ch];
		if (soft) {
			if (n1 === '\u0301') {
				out.push(soft + '\u0301');
				i += 2;
				continue;
			}
			out.push(soft);
			i += 1;
			continue;
		}

		// ---------- caron/hacek ----------
		const caronMap: Record<string, string> = {
			č: 'ч',
			Č: 'Ч',
			š: 'ш',
			Š: 'Ш',
			ž: 'ж',
			Ž: 'Ж',
			ŭ: 'ў',
			Ŭ: 'Ў',
		};
		const caron = caronMap[ch];
		if (caron) {
			if (n1 === '\u0301') {
				out.push(caron + '\u0301');
				i += 2;
				continue;
			}
			out.push(caron);
			i += 1;
			continue;
		}

		// ---------- ł / l ----------
		if (ch === 'ł' || ch === 'Ł') {
			if (n1 === '\u0301') {
				out.push((upper(ch) ? 'Л' : 'л') + '\u0301');
				i += 2;
				continue;
			}
			out.push(upper(ch) ? 'Л' : 'л');
			i += 1;
			continue;
		}

		if (ch === 'l' || ch === 'L') {
			// l before vowel → ль + vowel (iotated if a/o/u)
			if (n1 != null && isLatVowel(n1)) {
				const latVowel = n1;
				const stressed = peek(2) === '\u0301';
				const isUpper = upper(ch);
				const vUpper = upper(latVowel);
				const lChar = isUpper ? 'Л' : 'л';

				if (latVowel === 'y' || latVowel === 'Y') {
					out.push(lChar + (vUpper ? 'Ы' : 'ы') + (stressed ? '\u0301' : ''));
					i += stressed ? 3 : 2;
					continue;
				}
				if (latVowel === 'i' || latVowel === 'I') {
					out.push(lChar + (vUpper ? 'І' : 'і') + (stressed ? '\u0301' : ''));
					i += stressed ? 3 : 2;
					continue;
				}
				if (latVowel === 'e' || latVowel === 'E') {
					out.push(lChar + (vUpper ? 'Е' : 'е') + (stressed ? '\u0301' : ''));
					i += stressed ? 3 : 2;
					continue;
				}

				const iotatedMap: Record<string, string> = {
					a: 'я',
					A: 'Я',
					o: 'ё',
					O: 'Ё',
					u: 'ю',
					U: 'Ю',
				};
				const iotated = iotatedMap[latVowel];
				if (iotated) {
					const result = lChar + (stressed ? iotated + '\u0301' : iotated);
					out.push(result);
					i += stressed ? 3 : 2;
					continue;
				}
			}

			// l before consonant → ль
			if (n1 != null) {
				if (n1 === '\u0301') {
					out.push((upper(ch) ? 'ЛЬ' : 'ль') + '\u0301');
					i += 2;
					continue;
				}
				out.push(upper(ch) ? 'ЛЬ' : 'ль');
				i += 1;
				continue;
			}
			// l at end → л (search fragment, more chars likely follow)
			out.push(upper(ch) ? 'Л' : 'л');
			i += 1;
			continue;
		}

		// ---------- 'e' (ie/e ambiguity — default to е) ----------
		// Latin e → both Cyrillic э (hard) and е (soft). We default to е;
		// the э case is handled by normalizeText (э→е) for search matching.
		// Round-trip Cyrillic→Latin→Cyrillic loses this distinction.
		if (ch === 'e' || ch === 'E') {
			if (n1 === '\u0301') {
				out.push((upper(ch) ? 'Е' : 'е') + '\u0301');
				i += 2;
				continue;
			}
			out.push(upper(ch) ? 'Е' : 'е');
			i += 1;
			continue;
		}

		// ---------- w ----------
		if (ch === 'w' || ch === 'W') {
			if (n1 === '\u0301') {
				out.push((upper(ch) ? 'Ў' : 'ў') + '\u0301');
				i += 2;
				continue;
			}
			out.push(upper(ch) ? 'Ў' : 'ў');
			i += 1;
			continue;
		}

		// ---------- j ----------
		if (ch === 'j' || ch === 'J') {
			if (n1 === '\u0301') {
				out.push((upper(ch) ? 'Й' : 'й') + '\u0301');
				i += 2;
				continue;
			}
			// j at end preceded by consonant: search fragment, assume truncated iotation → я
			if (n1 == null && i > 0 && !isLatVowel(s[i - 1])) {
				out.push(upper(ch) ? 'Я' : 'я');
				i += 1;
				continue;
			}
			out.push(upper(ch) ? 'Й' : 'й');
			i += 1;
			continue;
		}

		// ---------- simple 1-to-1 ----------
		const latToCyrSimple: Record<string, string> = {
			a: 'а',
			A: 'А',
			b: 'б',
			B: 'Б',
			c: 'ц',
			C: 'Ц',
			d: 'д',
			D: 'Д',
			f: 'ф',
			F: 'Ф',
			g: 'ґ',
			G: 'Ґ',
			h: 'г',
			H: 'Г',
			i: 'і',
			I: 'І',
			k: 'к',
			K: 'К',
			m: 'м',
			M: 'М',
			n: 'н',
			N: 'Н',
			o: 'о',
			O: 'О',
			p: 'п',
			P: 'П',
			r: 'р',
			R: 'Р',
			s: 'с',
			S: 'С',
			t: 'т',
			T: 'Т',
			u: 'у',
			U: 'У',
			v: 'в',
			V: 'В',
			y: 'ы',
			Y: 'Ы',
			z: 'з',
			Z: 'З',
		};
		const simple = latToCyrSimple[ch];
		if (simple) {
			if (n1 === '\u0301') {
				out.push(simple + '\u0301');
				i += 2;
				continue;
			}
			out.push(simple);
			i += 1;
			continue;
		}

		// default: keep as-is
		out.push(ch);
		i += 1;
	}

	return out.join('');
}
