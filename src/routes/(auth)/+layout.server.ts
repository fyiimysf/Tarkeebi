import { redirect } from '@sveltejs/kit';
import { safeRedirect } from '#lib/server/safe-redirect.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (locals.user) {
		redirect(302, safeRedirect(url.searchParams.get('redirectTo'), '/app'));
	}
	return {};
};
