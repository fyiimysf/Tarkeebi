import { env } from 'cloudflare:workers';
import { redirect } from '@sveltejs/kit';
import { getRecipeStats } from '#lib/server/recipe-stats.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// Sidebar counts are secondary chrome. Stream them so the route shell (and
	// any cached page data) can paint before this query finishes.
	const stats = getRecipeStats(env.DB, locals.user.id);
	stats.catch(() => {});

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image ?? null
		},
		stats
	};
};
