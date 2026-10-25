<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { theme } from '#lib/theme.svelte.ts';

	const isDark = $derived(theme.resolved === 'dark');

	/**
	 * A two-state switch, not a chooser. The three-way Light/Dark/System picker
	 * lives in Settings; here the icon shows the *current* state and clicking
	 * commits the opposite one. That means a device following the OS (stored
	 * value `system`) lands on an explicit theme the first time it is clicked,
	 * which is what someone reaching for a toggle expects.
	 */
	function toggle() {
		theme.set(isDark ? 'light' : 'dark');
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-pressed={isDark}
	aria-label={m.nav_toggle_theme()}
	title={isDark ? m.theme_light() : m.theme_dark()}
	class="btn-ghost size-10 p-0"
>
	{#if isDark}
		<Moon class="size-5" />
	{:else}
		<Sun class="size-5" />
	{/if}
</button>
