import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../assist-markdown';

describe('renderMarkdown', () => {
	it('renders bold and italic', () => {
		expect(renderMarkdown('**bold** and *italic*')).toBe('<p><strong>bold</strong> and <em>italic</em></p>');
	});

	it('renders code spans and fenced blocks', () => {
		expect(renderMarkdown('use `bun run dev`')).toContain('<code>bun run dev</code>');
		expect(renderMarkdown('```js\nconst x = 1;\n```')).toContain('<code class="language-js">');
	});

	it('renders links and images', () => {
		expect(renderMarkdown('[Слоўня](https://slounia.vercel.app)')).toContain(
			'<a href="https://slounia.vercel.app">Слоўня</a>',
		);
		expect(renderMarkdown('![alt](img.png)')).toContain('<img src="img.png" alt="alt"');
	});

	it('renders headings, blockquotes and lists', () => {
		expect(renderMarkdown('# Title')).toContain('<h1>Title</h1>');
		expect(renderMarkdown('> quote')).toContain('<blockquote>');
		expect(renderMarkdown('- a\n- b')).toContain('<li>a</li>');
		expect(renderMarkdown('1. a\n2. b')).toContain('<li>a</li>');
	});

	it('escapes raw HTML to prevent XSS', () => {
		expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script>');
		expect(renderMarkdown('**a** <b>not bold</b>')).not.toContain('<b>');
	});

	it('breaks single newlines', () => {
		expect(renderMarkdown('line one\nline two')).toContain('line one<br>line two');
	});
});
