import { describe, expect, it } from 'vitest';
import { decorateBlogImages } from '../blog-content';

describe('decorateBlogImages', () => {
	it('keeps the first image eager and high priority', () => {
		expect(decorateBlogImages('<img src="a.png" alt="a">')).toBe(
			'<img src="a.png" alt="a" decoding="async" fetchpriority="high">',
		);
	});

	it('lazy-loads later images', () => {
		expect(decorateBlogImages('<img src="a.png"><img src="b.png">')).toBe(
			'<img src="a.png" decoding="async" fetchpriority="high"><img src="b.png" decoding="async" loading="lazy">',
		);
	});

	it('does not duplicate existing hints', () => {
		expect(decorateBlogImages('<img src="a.png" loading="eager" decoding="sync">')).toBe(
			'<img src="a.png" loading="eager" decoding="sync" fetchpriority="high">',
		);
	});

	it('preserves self-closing syntax', () => {
		expect(decorateBlogImages('<img src="a.png" />')).toBe(
			'<img src="a.png" decoding="async" fetchpriority="high" />',
		);
	});

	it('leaves content without images untouched', () => {
		const html = '<p>no images here</p>';
		expect(decorateBlogImages(html)).toBe(html);
	});
});
