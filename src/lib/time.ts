import { m } from '#lib/paraglide/messages.js';

/**
 * Format a minute count as `45 min`, `2 h 5 min`, or `3 h`.
 * Returns an empty string for zero/negative values so callers can use it
 * directly in `{#if}` guards.
 */
export function formatMinutes(total: number | null | undefined): string {
	if (!total || total <= 0) return '';

	const hours = Math.floor(total / 60);
	const minutes = total % 60;

	if (hours === 0) return m.recipe_minutes({ count: minutes });
	if (minutes === 0) return m.recipe_duration_whole({ hours });
	return m.recipe_duration({ hours, minutes });
}
