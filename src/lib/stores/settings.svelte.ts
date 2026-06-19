class SettingsStore {
	showLatin = $state(false);

	load() {
		try {
			this.showLatin = localStorage.getItem('show_latin') === 'true';
		} catch {
			// localStorage unavailable
		}
	}

	toggleLatin() {
		this.showLatin = !this.showLatin;
		try {
			localStorage.setItem('show_latin', String(this.showLatin));
		} catch {
			// localStorage unavailable
		}
	}
}

export const settings = new SettingsStore();
