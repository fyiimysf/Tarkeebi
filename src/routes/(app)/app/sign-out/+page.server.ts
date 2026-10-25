import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	redirect(302, '/app');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		await locals.auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	}
};
