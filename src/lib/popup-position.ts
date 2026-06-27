export function computePopupPosition(rect: DOMRect, options: { gap?: number; minHeight?: number } = {}) {
	const gap = options.gap ?? 6;
	const minHeight = options.minHeight ?? 50;

	const spaceBelow = window.innerHeight - rect.bottom;
	const spaceAbove = rect.top;
	const above = spaceBelow < minHeight + gap && spaceAbove >= minHeight + gap;

	const top = above ? Math.max(gap, rect.top - gap) : rect.bottom + gap;

	const maxHeight = Math.max(100, above ? top - gap * 2 : window.innerHeight - top - gap * 2);

	return { top, maxHeight, above };
}
