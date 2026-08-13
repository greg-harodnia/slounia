import type WordOverlay from '$lib/components/WordOverlay.svelte';
import type BlogOverlay from '$lib/components/BlogOverlay.svelte';
import type ContactModal from '$lib/components/ContactModal.svelte';
import type EditWord from '$lib/components/EditWord.svelte';
import type TranslationForm from '$lib/components/TranslationForm.svelte';
import type ChatWidget from '$lib/components/ChatWidget.svelte';

// Lazily-loaded component constructors shared across the app. Any component can
// call a preload* function (from a hover handler, on mount, etc.) to warm the
// chunk and set the constructor here; templates render `overlays.*` directly so
// opening never blocks on a chunk download.
export const overlays = $state({
	word: undefined as typeof WordOverlay | undefined,
	blog: undefined as typeof BlogOverlay | undefined,
	contact: undefined as typeof ContactModal | undefined,
	editWord: undefined as typeof EditWord | undefined,
	translationForm: undefined as typeof TranslationForm | undefined,
	chat: undefined as typeof ChatWidget | undefined,
});

// Internal non-reactive caches of in-flight/finished loads (SvelteSet/SvelteMap
// are not used on purpose: these are never rendered or observed).
/* eslint-disable svelte/prefer-svelte-reactivity */
const loaded = new Set<string>();
const pending = new Map<string, Promise<unknown>>();
/* eslint-enable svelte/prefer-svelte-reactivity */

function load<T>(key: string, set: (ctor: T) => void, loader: () => Promise<{ default: T }>) {
	if (loaded.has(key) || pending.has(key)) return;
	const p = loader()
		.then((m) => set(m.default))
		.catch((e) => {
			console.error(e);
			pending.delete(key);
		});
	pending.set(key, p);
	p.then(() => {
		loaded.add(key);
		pending.delete(key);
	});
}

export function preloadWordOverlay() {
	load(
		'word',
		(c) => (overlays.word = c),
		() => import('$lib/components/WordOverlay.svelte'),
	);
}

export function preloadBlogOverlay() {
	load(
		'blog',
		(c) => (overlays.blog = c),
		() => import('$lib/components/BlogOverlay.svelte'),
	);
}

export function preloadContactModal() {
	load(
		'contact',
		(c) => (overlays.contact = c),
		() => import('$lib/components/ContactModal.svelte'),
	);
}

export function preloadEditWord() {
	load(
		'edit-word',
		(c) => (overlays.editWord = c),
		() => import('$lib/components/EditWord.svelte'),
	);
}

export function preloadTranslationForm() {
	load(
		'translation-form',
		(c) => (overlays.translationForm = c),
		() => import('$lib/components/TranslationForm.svelte'),
	);
}

export function preloadChatWidget() {
	load(
		'chat',
		(c) => (overlays.chat = c),
		() => import('$lib/components/ChatWidget.svelte'),
	);
}
