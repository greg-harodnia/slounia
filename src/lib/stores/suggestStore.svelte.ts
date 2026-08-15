import type { Suggestion } from '$lib/types';

class SuggestStore {
	suggestions = $state<Suggestion[]>([]);
	loading = $state(false);
	error = $state(false);

	async fetchSuggestions(userToken = '') {
		this.loading = true;
		this.error = false;
		try {
			const params = userToken ? `?token=${encodeURIComponent(userToken)}` : '';
			const res = await fetch(`/api/suggestions${params}`);
			if (res.ok) {
				this.suggestions = await res.json();
			} else {
				this.error = true;
			}
		} catch (e) {
			console.error(e);
			this.error = true;
		} finally {
			this.loading = false;
		}
	}

	removeSuggestion(id: number) {
		this.suggestions = this.suggestions.filter((s) => s.id !== id);
	}
}

export const suggestStore = new SuggestStore();
