// User-scoped state for this device: liked words/translations/posts, like
// and view counts, plus the user token. Stores own the authoritative counts
// because mutating cached objects through a $state proxy does not write back.
class UserStore {
	words = $state<Record<string, boolean>>({});
	wordLikes = $state<Record<string, number>>({});
	translations = $state<Record<string, boolean>>({});
	translationLikes = $state<Record<string, number>>({});
	posts = $state<Record<string, boolean>>({});
	postLikes = $state<Record<string, number>>({});
	views = $state<Record<string, number>>({});
	#viewed = new Set<string>();
	userToken = $state('');
	#loaded = false;

	load() {
		if (this.#loaded) return;
		try {
			const w = localStorage.getItem('liked_words');
			if (w) this.words = JSON.parse(w);
			const t = localStorage.getItem('liked_translations');
			if (t) this.translations = JSON.parse(t);
			const p = localStorage.getItem('liked_posts');
			if (p) this.posts = JSON.parse(p);
			let tok = localStorage.getItem('user_token');
			if (!tok) {
				tok = crypto.randomUUID();
				localStorage.setItem('user_token', tok);
			}
			this.userToken = tok;
			this.#loaded = true;
		} catch (e) {
			console.error(e);
		}
	}

	getWordLikeCount(wordId: string, fallback: number) {
		return this.wordLikes[wordId] ?? fallback;
	}

	toggleWordLike(wordId: string, currentLikes: number) {
		return this.#toggleLike({
			id: wordId,
			currentCount: currentLikes,
			liked: () => this.words,
			setLiked: (m) => (this.words = m),
			counts: this.wordLikes,
			persistKey: 'liked_words',
			endpoint: `/api/words/${encodeURIComponent(wordId)}/like`,
		});
	}

	getTranslationLikeCount(translationId: number, fallback: number) {
		return this.translationLikes[translationId] ?? fallback;
	}

	toggleTranslationLike(translationId: number, currentLikes: number) {
		return this.#toggleLike({
			id: String(translationId),
			currentCount: currentLikes,
			liked: () => this.translations,
			setLiked: (m) => (this.translations = m),
			counts: this.translationLikes,
			persistKey: 'liked_translations',
			endpoint: `/api/translations/${translationId}/like`,
		});
	}

	isPostLiked(slug: string) {
		return !!this.posts[slug];
	}

	getPostLikeCount(slug: string, fallback: number) {
		return this.postLikes[slug] ?? fallback;
	}

	togglePostLike(slug: string, currentLikes: number) {
		return this.#toggleLike({
			id: slug,
			currentCount: currentLikes,
			liked: () => this.posts,
			setLiked: (m) => (this.posts = m),
			counts: this.postLikes,
			persistKey: 'liked_posts',
			endpoint: `/api/blog/${encodeURIComponent(slug)}/like`,
		});
	}

	// Single optimistic-toggle implementation shared by word/translation/post
	// likes: flip the liked set, adjust the count, then confirm from the server
	// and roll everything back (including persistence) on failure.
	async #toggleLike({
		id,
		currentCount,
		liked,
		setLiked,
		counts,
		persistKey,
		endpoint,
	}: {
		id: string;
		currentCount: number;
		liked: () => Record<string, boolean>;
		setLiked: (m: Record<string, boolean>) => void;
		counts: Record<string, number>;
		persistKey: string;
		endpoint: string;
	}) {
		const likedMap = liked();
		const isLiked = !!likedMap[id];
		const prevLiked = likedMap;
		const prevCount = counts[id] ?? currentCount;

		if (isLiked) {
			const { [id]: _, ...rest } = likedMap;
			setLiked(rest);
			counts[id] = Math.max(prevCount - 1, 0);
		} else {
			setLiked({ ...likedMap, [id]: true });
			counts[id] = prevCount + 1;
		}
		this.#persist(persistKey, liked());

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ like: !isLiked }),
			});
			if (!res.ok) throw new Error('Server error');
			const data = await res.json();
			counts[id] = data.likes;
		} catch (e) {
			setLiked(prevLiked);
			counts[id] = prevCount;
			this.#persist(persistKey, prevLiked);
			console.error(e);
		}
	}

	getViewCount(kind: 'word' | 'post', id: string, fallback: number) {
		return this.views[this.#viewKey(kind, id)] ?? fallback;
	}

	// Unlike likes, a view is one-directional (never undone) and counted once
	// per session with no persistence, so it keeps its own implementation.
	async incrementView(kind: 'word' | 'post', id: string, fallback: number) {
		const key = this.#viewKey(kind, id);
		if (this.#viewed.has(key)) return;
		this.#viewed.add(key);

		const prev = this.views[key];
		this.views[key] = Math.max((this.views[key] ?? fallback) + 1, 0);

		try {
			const res = await fetch('/api/views', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind, id }),
			});
			if (!res.ok) throw new Error('Server error');
			const data = await res.json();
			if (data?.views != null) this.views[key] = data.views;
		} catch (e) {
			this.views[key] = prev ?? fallback;
			this.#viewed.delete(key);
			console.error(e);
		}
	}

	#viewKey(kind: 'word' | 'post', id: string) {
		return `${kind}:${id}`;
	}

	#persist(key: string, map: Record<string, unknown>) {
		try {
			localStorage.setItem(key, JSON.stringify(map));
		} catch {
			/* localStorage unavailable */
		}
	}
}

export const userStore = new UserStore();
