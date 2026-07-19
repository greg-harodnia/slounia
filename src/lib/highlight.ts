function escapeHtml(s: string): string {
	return s.replace(
		/[&<>"']/g,
		(c) =>
			(({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }) as Record<string, string>)[c],
	);
}

// Lossy normalizations for cross-script search matching.
// The trade-off: certain distinctions are unavoidably lost in a single-query
// search (ё/е→е, э/е→е, ł/l→l, ŭ/u→u, г/ґ→ґ, и/і→і, у/ў→ў).
// The visual display text preserves correctness; matching is lenient.
export function normalizeText(s: string): string {
	return s
		.toLowerCase()
		.replace(/[ʼ'`]/g, '’')
		.replace(/\u0301/g, '')
		.replace(/ё/g, 'е')
		.replace(/э/g, 'е')
		.replace(/и/g, 'і')
		.replace(/i/g, 'і')
		.replace(/у/g, 'ў')
		.replace(/г/g, 'ґ')
		.replace(/ł/g, 'l')
		.replace(/ŭ/g, 'u');
}

// matchText: optional separate string to match regex against (e.g. searchForm
// in Latin mode). May differ from cleanText in length when cyrNorm before
// cyrToLat changes char count (e.g. э→е makes cyrToLat produce "e" vs "ie").
// When lengths diverge, we map matched indices from matchStr back to text.
// Apostrophe: [ʼ'`'?] inserted between each query char so "абя" matches
// "аб'ява", "аб'ява", "абʼява" without corrupting slice indices.
export function highlightText(text: string, query: string, matchText?: string): string {
	const cleanText = text.replace(/\u0301/g, '');

	if (!query.trim()) return escapeHtml(text);

	const terms = query
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((t) => {
			const normalized = normalizeText(t);
			return [...normalized].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("[ʼ'`’]?");
		});
	const matchStr = matchText != null ? matchText.replace(/\u0301/g, '') : cleanText;
	const normalized = normalizeText(matchStr);
	const regex = new RegExp(`(${terms.join('|')})`, 'gi');

	const matched = new Set<number>();
	let m: RegExpExecArray | null;
	while ((m = regex.exec(normalized)) !== null) {
		for (let j = m.index; j < m.index + m[0].length; j++) {
			matched.add(j);
		}
	}

	// When matchStr differs in length from cleanText (e.g. cyrToLat("э")="e"
	// vs cyrToLat("е")="ie"), map matched indices from matchStr back to
	// cleanText positions so highlighting lands on the right characters.
	let matchedInText = matched;
	if (matchText != null && matchStr.length !== cleanText.length) {
		matchedInText = new Set<number>();
		let ti = 0;
		let mi = 0;
		const matchToText = new Map<number, number>();
		while (ti < cleanText.length && mi < matchStr.length) {
			if (cleanText[ti] === matchStr[mi]) {
				matchToText.set(mi, ti);
				ti++;
				mi++;
			} else {
				mi++;
			}
		}
		for (const idx of matched) {
			const textIdx = matchToText.get(idx);
			if (textIdx !== undefined) {
				matchedInText.add(textIdx);
			}
		}
	}

	const result: string[] = [];
	let inMark = false;
	let ci = 0;
	for (const ch of text) {
		if (ch === '\u0301') {
			result.push(ch);
			continue;
		}
		const isMatch = matchedInText.has(ci);
		if (isMatch && !inMark) {
			result.push('<mark>');
			inMark = true;
		} else if (!isMatch && inMark) {
			result.push('</mark>');
			inMark = false;
		}
		result.push(escapeHtml(ch));
		ci++;
	}
	if (inMark) result.push('</mark>');

	return result.join('');
}
