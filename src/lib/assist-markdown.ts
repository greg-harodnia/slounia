import { marked } from 'marked';

// Escape raw HTML so model output can't inject markup, then render Markdown to
// HTML for the chat widget. Marked does not sanitize, so escaping first is the
// protection against <script> etc. in the model's reply. `>` is left intact so
// blockquotes still parse; without `<` it can't open a tag.
function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

marked.use({
	gfm: true,
	breaks: true,
});

export function renderMarkdown(text: string): string {
	return (marked.parse(escapeHtml(text)) as string).trim();
}
