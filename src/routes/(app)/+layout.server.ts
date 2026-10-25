import { env } from 'cloudflare:workers';
import { redirect } from '@sveltejs/kit';
import { getRecipeStats } from '#lib/server/recipe-stats.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const stats = await getRecipeStats(env.DB, locals.user.id);

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
