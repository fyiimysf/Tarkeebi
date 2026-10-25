/**
 * Only allow redirects to same-origin, absolute paths.
 * Prevents open-redirects via `?redirectTo=`.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/'): string {
	if (!value) return fallback;
	if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return fallback;
	}
	return value;
}
