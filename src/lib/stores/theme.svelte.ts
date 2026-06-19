const ALL_THEMES = ['light', 'dark', 'national'] as const;
type Theme = (typeof ALL_THEMES)[number];

function isMobile() {
	try {
		return window.innerWidth <= 1024;
	} catch {
		return true;
	}
}

function availableThemes(): Theme[] {
	return isMobile() ? ['light', 'dark'] : [...ALL_THEMES];
}

const META_COLORS: Record<Theme, string> = {
	light: '#f5f7fa',
	dark: '#0f172a',
	national: '#c1382e',
};

class ThemeStore {
	name = $state<Theme>('light');

	#mediaQuery: MediaQueryList | null = null;
	#listener: ((e: MediaQueryListEvent) => void) | null = null;

	load() {
		try {
			const stored = localStorage.getItem('theme') as Theme | null;
			if (stored && ALL_THEMES.includes(stored as Theme)) {
				if (stored === 'national' && isMobile()) {
					this.name = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
				} else {
					this.name = stored as Theme;
				}
			} else {
				this.name = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			this.apply();
		} catch {
			this.name = (document.documentElement.dataset.theme as Theme) || 'light';
		}
	}

	listen() {
		this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.#listener = (e: MediaQueryListEvent) => {
			if (localStorage.getItem('theme') !== null) return;
			this.name = e.matches ? 'dark' : 'light';
			this.apply();
		};
		this.#mediaQuery.addEventListener('change', this.#listener);
	}

	destroy() {
		if (this.#mediaQuery && this.#listener) {
			this.#mediaQuery.removeEventListener('change', this.#listener);
		}
	}

	toggle() {
		const avail = availableThemes();
		const idx = avail.indexOf(this.name);
		if (idx === -1) {
			this.select(avail[0]);
		} else {
			this.select(avail[(idx + 1) % avail.length]);
		}
	}

	select(t: Theme) {
		this.name = t;
		try {
			localStorage.setItem('theme', t);
		} catch {
			/* localStorage unavailable */
		}
		this.apply();
	}

	apply() {
		document.documentElement.dataset.theme = this.name;
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) {
			meta.setAttribute('content', META_COLORS[this.name]);
		}
	}
}

export { type Theme, ALL_THEMES };
export const theme = new ThemeStore();
