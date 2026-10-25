import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { m } from '#lib/paraglide/messages.js';
import { safeRedirect } from '#lib/server/safe-redirect.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return { redirectTo: safeRedirect(url.searchParams.get('redirectTo'), '/app') };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim() ?? '';
		const password = form.get('password')?.toString() ?? '';
		const redirectTo = safeRedirect(form.get('redirectTo')?.toString(), '/app');

		try {
			await locals.auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { email, message: error.message || m.auth_failed() });
			}
			return fail(500, { email, message: m.auth_failed() });
		}

		redirect(302, redirectTo);
	}
};
