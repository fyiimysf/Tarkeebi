import { browser } from '$app/env';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tarkeebi:theme';

/**
 * Small, dependency-free theme controller shared across the app.
 *
 * The initial value is also applied by an inline script in `app.html` so the
 * correct theme is set before first paint; this class keeps that in sync when
 * the user changes the preference at runtime.
 */
class ThemeController {
	value = $state<Theme>('system');
	systemDark = $state(false);

	initialized = false;

	get resolved(): 'light' | 'dark' {
		return this.value === 'system' ? (this.systemDark ? 'dark' : 'light') : this.value;
	}

	set(value: Theme) {
		this.value = value;
		if (browser) localStorage.setItem(STORAGE_KEY, value);
	}

	apply() {
		if (!browser) return;
		const dark = this.resolved === 'dark';
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	}

	/** Idempotent; call once from the root layout. */
	init() {
		if (!browser || this.initialized) return;
		this.initialized = true;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			this.value = stored;
		}

		const media = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = media.matches;
		media.addEventListener('change', (event) => (this.systemDark = event.matches));

		$effect.root(() => {
			$effect(() => {
				this.apply();
			});
		});
	}
}

export const theme = new ThemeController();
