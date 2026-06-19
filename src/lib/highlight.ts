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
// in Latin mode). Same length as cleanText (both derived from the same
// Cyrillic source), so match indices map 1:1. Needed because some chars
// diverge in cyrToLat (ё→o/е→e, ў→ŭ/у→u) — using cleanText directly would miss.
// Apostrophe: [ʼ'`’]? inserted between each query char so "абя" matches
// "аб'ява", "аб’ява", "абʼява" without corrupting slice indices.
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
	const normalized = normalizeText(matchText != null ? matchText.replace(/\u0301/g, '') : cleanText);
	const regex = new RegExp(`(${terms.join('|')})`, 'gi');

	const matched = new Set<number>();
	let m: RegExpExecArray | null;
	while ((m = regex.exec(normalized)) !== null) {
		for (let j = m.index; j < m.index + m[0].length; j++) {
			matched.add(j);
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
		const isMatch = matched.has(ci);
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
