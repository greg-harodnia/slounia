class LikesStore {
	words = $state<Record<string, boolean>>({});
	translations = $state<Record<number, boolean>>({});
	userToken = $state('');
	#loaded = false;

	load() {
		if (this.#loaded) return;
		try {
			const w = localStorage.getItem('liked_words');
			if (w) this.words = JSON.parse(w);
			const t = localStorage.getItem('liked_translations');
			if (t) this.translations = JSON.parse(t);
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

	async toggleWord(wordId: string, word: { likes: number }) {
		const liked = !!this.words[wordId];
		const prevWords = this.words;
		const prevLikes = word.likes;

		if (liked) {
			const { [wordId]: _, ...rest } = this.words;
			this.words = rest;
			word.likes = Math.max(word.likes - 1, 0);
		} else {
			this.words = { ...this.words, [wordId]: true };
			word.likes += 1;
		}
		this.saveWords();

		try {
			const res = await fetch(`/api/words/${encodeURIComponent(wordId)}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ like: !liked }),
			});
			if (res.ok) {
				const data = await res.json();
				word.likes = data.likes;
			} else {
				throw new Error('Server error');
			}
		} catch (e) {
			this.words = prevWords;
			word.likes = prevLikes;
			this.saveWords();
			console.error(e);
		}
	}

	async toggleTranslation(translationId: number, tr: { likes: number }) {
		const liked = !!this.translations[translationId];
		const prevTranslations = this.translations;
		const prevLikes = tr.likes;

		if (liked) {
			tr.likes = Math.max(tr.likes - 1, 0);
		} else {
			tr.likes += 1;
		}
		if (liked) {
			const { [translationId]: _, ...rest } = this.translations;
			this.translations = rest;
		} else {
			this.translations = { ...this.translations, [translationId]: true };
		}
		this.saveTranslations();

		try {
			const res = await fetch(`/api/translations/${translationId}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ like: !liked }),
			});
			if (!res.ok) {
				throw new Error('Server error');
			}
		} catch (e) {
			this.translations = prevTranslations;
			this.saveTranslations();
			tr.likes = prevLikes;
			console.error(e);
		}
	}

	private saveWords() {
		try {
			localStorage.setItem('liked_words', JSON.stringify(this.words));
		} catch {
			/* localStorage unavailable */
		}
	}

	private saveTranslations() {
		try {
			localStorage.setItem('liked_translations', JSON.stringify(this.translations));
		} catch {
			/* localStorage unavailable */
		}
	}
}

export const likes = new LikesStore();
