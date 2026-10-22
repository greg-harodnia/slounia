function addAttribute(attrs: string, name: string, value: string): string {
	// Match only a real attribute: `data-loading=` must not count as `loading=`.
	if (new RegExp(`(?:^|\\s)${name}\\s*=`, 'i').test(attrs)) return attrs;
	return `${attrs} ${name}="${value}"`;
}

// Blog posts are stored as HTML, so images pasted through the admin have no
// loading hints. Decorate them at render time (idempotently): the first image
// is likely the LCP element, so keep it eager and high priority; later images
// are lazy-loaded to avoid downloading off-screen assets.
export function decorateBlogImages(html: string): string {
	let first = true;

	// Attribute values may contain `>` (e.g. `alt="a > b"`), so skip over
	// quoted strings instead of stopping at the first `>`.
	return html.replace(/<img\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi, (_match, attrs: string) => {
		const selfClosing = /\/\s*$/.test(attrs);
		let next = attrs.replace(/\/\s*$/, '').trimEnd();
		next = addAttribute(next, 'decoding', 'async');

		if (first) {
			next = addAttribute(next, 'fetchpriority', 'high');
			first = false;
		} else {
			next = addAttribute(next, 'loading', 'lazy');
		}

		return `<img${next}${selfClosing ? ' />' : '>'}`;
	});
}
