import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	return {
		user: {
			name: locals.user!.name,
			email: locals.user!.email,
			image: locals.user!.image ?? null
		}
	};
};

export const actions: Actions = {
	signOut: async ({ locals, request }) => {
		await locals.auth.api.signOut({ headers: request.headers });
		redirect(302, '/login');
	}
};
