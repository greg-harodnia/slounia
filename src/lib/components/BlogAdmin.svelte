<script lang="ts">
	import Modal from './Modal.svelte';
	import type { Post } from '$lib/types';

	let {
		posts,
		onChange,
	}: {
		posts: Post[];
		onChange: () => void;
	} = $props();

	let open = $state(false);
	let editing = $state<Post | null>(null);

	let slug = $state('');
	let title = $state('');

	function toHtml(text: string): string {
		if (/<(p|div|h[1-6]|blockquote|ul|ol|li|table|pre)[\s>]/i.test(text)) return text;
		return text
			.split(/\n\s*\n/)
			.map((block) => `<p>${block.trim().replace(/\n/g, '<br>')}</p>`)
			.join('\n');
	}

	function toPlain(html: string): string {
		return html
			.replace(/<\/p>\s*<p>/g, '\n\n')
			.replace(/<br\s*\/?>/g, '\n')
			.replace(/<\/?p>/g, '')
			.trim();
	}

	let content = $state('');
	let hashtagsStr = $state('');
	let isPinned = $state(false);
	let publishedAt = $state('');
	let submitting = $state(false);
	let uploading = $state(false);
	let error = $state('');

	let textareaEl: HTMLTextAreaElement | undefined = $state();

	function insertStress() {
		if (!textareaEl) return;
		const start = textareaEl.selectionStart;
		const end = textareaEl.selectionEnd;
		const before = content.slice(0, start);
		const selected = content.slice(start, end);
		const after = content.slice(end);

		if (selected) {
			content = before + selected + '\u0301' + after;
			requestAnimationFrame(() => {
				textareaEl!.selectionStart = textareaEl!.selectionEnd = start + selected.length + 1;
				textareaEl!.focus();
			});
		} else {
			content = before + '\u0301' + after;
			requestAnimationFrame(() => {
				textareaEl!.selectionStart = textareaEl!.selectionEnd = start + 1;
				textareaEl!.focus();
			});
		}
	}

	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.kind === 'file' && item.type.startsWith('image/')) {
				e.preventDefault();
				const file = item.getAsFile();
				if (!file) continue;

				uploading = true;
				error = '';

				const fd = new FormData();
				fd.append('image', file, file.name || 'pasted-image.png');

				try {
					const res = await fetch('/api/blog/upload-image', { method: 'POST', body: fd });
					const data = await res.json();
					if (!res.ok || !data.url) {
						error = data.error || 'Failed to upload image';
						return;
					}

					const alt = (prompt('Alt text for image:')?.trim() || '').replace(/"/g, '&quot;');
					const imgTag = `<img src="${data.url}" alt="${alt}">`;
					const ta = e.target as HTMLTextAreaElement;
					const start = ta.selectionStart;
					const end = ta.selectionEnd;
					content = content.slice(0, start) + imgTag + content.slice(end);

					requestAnimationFrame(() => {
						ta.selectionStart = ta.selectionEnd = start + imgTag.length;
						ta.focus();
					});
				} catch {
					error = 'Network error uploading image';
				} finally {
					uploading = false;
				}
			}
		}
	}

	function resetForm() {
		slug = '';
		title = '';
		content = '';
		hashtagsStr = '';
		isPinned = false;
		publishedAt = '';
		error = '';
		editing = null;
	}

	function editPost(post: Post) {
		editing = post;
		slug = post.slug;
		title = post.title;
		content = toPlain(post.content);
		hashtagsStr = (post.hashtags || []).join(', ');
		isPinned = post.is_pinned;
		publishedAt = post.published_at.slice(0, 16);
		error = '';
		open = true;
	}

	function createNew() {
		resetForm();
		publishedAt = new Date().toISOString().slice(0, 16);
		open = true;
	}

	async function handleSubmit() {
		error = '';
		if (!slug.trim() || !title.trim() || !content.trim()) {
			error = 'Slug, title and content are required';
			return;
		}

		submitting = true;
		try {
			const hashtags = hashtagsStr
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const body = {
				slug: slug.trim(),
				title: title.trim(),
				content: toHtml(content.trim()),
				hashtags,
				is_pinned: isPinned,
				published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
			};

			let res: Response;
			if (editing) {
				res = await fetch(`/api/blog/${editing.slug}/edit`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
			} else {
				res = await fetch('/api/blog/create', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
			}

			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed to save';
				return;
			}

			resetForm();
			open = false;
			onChange();
		} catch {
			error = 'Network error';
		} finally {
			submitting = false;
		}
	}

	async function deletePost(post: Post) {
		if (!confirm(`Delete "${post.title}"?`)) return;
		try {
			const res = await fetch(`/api/blog/${post.slug}/edit`, { method: 'DELETE' });
			if (!res.ok) {
				error = 'Failed to delete';
				return;
			}
			onChange();
		} catch {
			error = 'Network error';
		}
	}

	function close() {
		open = false;
		error = '';
	}
</script>

<button class="add-btn" onclick={createNew}>+ Новы запіс</button>

<Modal title={editing ? 'Рэдагаваць запіс' : 'Новы запіс'} {open} onclose={close} wide>
	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<label>
		Slug *
		<input type="text" bind:value={slug} placeholder="first-post" />
	</label>

	<label>
		Title *
		<input type="text" bind:value={title} placeholder="Post title" />
	</label>

	<label>
		Content *
		<div class="editor-toolbar">
			<button class="toolbar-btn" onclick={insertStress} title="Націск (Combining Acute Accent)">&#x301;</button>
		</div>
		<textarea
			bind:value={content}
			bind:this={textareaEl}
			rows="12"
			placeholder="Пішыце звычайны тэкст. Пусты радок = новы абзац."
			onpaste={handlePaste}></textarea>
		{#if uploading}
			<span class="upload-hint">Выява загружаецца...</span>
		{/if}
	</label>

	<label>
		Hashtags (comma separated)
		<input type="text" bind:value={hashtagsStr} placeholder="навіны, слоўнік" />
	</label>

	<label class="checkbox-label">
		<input type="checkbox" bind:checked={isPinned} />
		Pinned
	</label>

	<label>
		Published at
		<input type="datetime-local" bind:value={publishedAt} />
	</label>

	{#snippet footer()}
		<button class="cancel-btn" onclick={close}>Скасаваць</button>
		<button class="submit-btn" onclick={handleSubmit} disabled={submitting}>
			{submitting ? 'Захаваньне...' : 'Захаваць'}
		</button>
	{/snippet}
</Modal>

{#if posts.length > 0}
	<div class="admin-list">
		<h3>Усе запісы</h3>
		{#each posts as post (post.id)}
			<div class="admin-row">
				<span class="admin-row-title">{post.title}</span>
				<span class="admin-row-slug">{post.slug}</span>
				<div class="admin-row-actions">
					<button class="edit-btn" onclick={() => editPost(post)}>Рэдагаваць</button>
					<button class="delete-btn" onclick={() => deletePost(post)}>Выдаліць</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.add-btn {
		flex-shrink: 0;
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		font-family: inherit;
		white-space: nowrap;
	}
	.add-btn:hover {
		opacity: 0.85;
	}

	.error-msg {
		background: var(--c-like-light);
		color: var(--c-like);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}

	label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--c-text-muted);
		margin-top: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	label input,
	label textarea {
		display: block;
		width: 100%;
		margin-top: 0.3rem;
		padding: 0.5rem 0.75rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
	}

	label input:focus,
	label textarea:focus {
		border-color: var(--c-primary);
	}

	label textarea {
		resize: vertical;
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.upload-hint {
		display: inline-block;
		margin-top: 0.3rem;
		font-size: 0.75rem;
		color: var(--c-primary);
		font-weight: 500;
		text-transform: none;
		letter-spacing: normal;
	}

	.editor-toolbar {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.3rem;
	}

	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 1.1rem;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
		font-family: inherit;
	}
	.toolbar-btn:hover {
		border-color: var(--c-primary);
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-transform: none;
		letter-spacing: normal;
	}
	.checkbox-label input {
		width: auto;
		margin-top: 0;
	}

	.admin-list {
		margin-top: 1.5rem;
	}
	.admin-list h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--c-text);
		margin-bottom: 0.5rem;
	}

	.admin-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--c-border);
		font-size: 0.85rem;
	}
	.admin-row-title {
		font-weight: 600;
		color: var(--c-text);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}
	.admin-row-slug {
		color: var(--c-text-muted);
		font-size: 0.8rem;
		font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
	}
	.admin-row-actions {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.edit-btn,
	.delete-btn {
		padding: 0.25rem 0.6rem;
		border: none;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: opacity 0.15s;
	}
	.edit-btn {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}
	.delete-btn {
		background: var(--c-like-light);
		color: var(--c-like);
	}
	.edit-btn:hover,
	.delete-btn:hover {
		opacity: 0.8;
	}

	.cancel-btn {
		padding: 0.5rem 1rem;
		border: 1.5px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.submit-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--c-primary);
		color: #fff;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.cancel-btn,
	.submit-btn {
		transition: opacity 0.15s;
	}
	.cancel-btn:hover,
	.submit-btn:hover {
		opacity: 0.85;
	}
</style>
