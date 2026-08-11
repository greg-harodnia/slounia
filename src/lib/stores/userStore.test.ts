import { describe, expect, it, vi, beforeEach } from 'vitest';
import { userStore } from './userStore.svelte';

beforeEach(() => {
	vi.restoreAllMocks();
	userStore.words = {};
	userStore.wordLikes = {};
	userStore.translations = {};
	userStore.translationLikes = {};
	userStore.posts = {};
	userStore.postLikes = {};
	userStore.views = {};
});

function fetchOk(json: unknown) {
	return vi.fn().mockResolvedValue({ ok: true, json: async () => json });
}

describe('incrementView in dev (vitest defaults to PROD=false)', () => {
	it('does not bump the count and does not fetch', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await userStore.incrementView('word', 'abc', 7);
		expect(userStore.getViewCount('word', 'abc', 7)).toBe(7);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('toggleWordLike', () => {
	it('optimistically likes, then adopts the server count', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(fetchOk({ likes: 5 }));
		await userStore.toggleWordLike('w1', 3);
		expect(userStore.words['w1']).toBe(true);
		expect(userStore.wordLikes['w1']).toBe(5);
	});

	it('rolls the liked-set and count back when the request fails', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
		await userStore.toggleWordLike('w1', 3);
		expect(userStore.words['w1']).toBeUndefined();
		expect(userStore.wordLikes['w1']).toBe(3);
	});

	it('unlikes and decrements', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(fetchOk({ likes: 2 }));
		await userStore.toggleWordLike('w1', 3);
		await userStore.toggleWordLike('w1', 3);
		expect(userStore.words['w1']).toBeUndefined();
		expect(userStore.wordLikes['w1']).toBe(2);
	});
});

describe('toggleTranslationLike', () => {
	it('adopts the server count on success', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(fetchOk({ likes: 9 }));
		await userStore.toggleTranslationLike(42, 8);
		expect(userStore.translations[42]).toBe(true);
		expect(userStore.translationLikes[42]).toBe(9);
	});
});
