import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { recipe } from '#lib/server/db/schema.ts';
import { uniqueRecipeSlug } from '#lib/server/slug.ts';
import {
	parseIngredients,
	parseRecipeFields,
	parseSteps,
	replaceRecipeIngredients,
	replaceRecipeSteps,
	replaceRecipeTags
} from '#lib/server/recipe-form.ts';
import { deleteRecipeImage, ImageUploadError, uploadRecipeImage } from '#lib/server/storage.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const db = getDb(env.DB);
		const form = await request.formData();
		const fields = parseRecipeFields(form);

		if (!fields.title) {
			return fail(400, { message: 'A title is required.', title: '' });
		}

		const id = crypto.randomUUID();
		const userId = locals.user!.id;
		const ingredients = parseIngredients(form);
		const steps = parseSteps(form);

		const image = form.get('image');
		let uploaded: { key: string; url: string } | null = null;

		if (image instanceof File && image.size > 0) {
			try {
				uploaded = await uploadRecipeImage(image, userId);
			} catch (error) {
				return fail(400, {
					message:
						error instanceof ImageUploadError
							? error.message
							: 'The image could not be uploaded. Please try again.',
					title: fields.title
				});
			}
		}

		try {
			// A slug is created up front so even a private recipe can be shared
			// by link before (or without) ever being published.
			const slug = await uniqueRecipeSlug(db, fields.title);

			await db.insert(recipe).values({
				id,
				userId,
				title: fields.title,
				description: fields.description,
				notes: fields.notes,
				imageUrl: uploaded?.url ?? null,
				imageKey: uploaded?.key ?? null,
				servings: fields.servings,
				prepMinutes: fields.prepMinutes,
				cookMinutes: fields.cookMinutes,
				sourceUrl: fields.sourceUrl,
				slug,
				isPublic: fields.isPublic,
				publishedAt: fields.isPublic ? new Date() : null
			});

			await replaceRecipeIngredients(db, id, ingredients);
			await replaceRecipeSteps(db, id, steps);
			await replaceRecipeTags(db, id, userId, fields.tags);
		} catch (error) {
			if (uploaded) await deleteRecipeImage(uploaded.key);
			await db.delete(recipe).where(eq(recipe.id, id));
			throw error;
		}

		redirect(302, `/app/recipes/${id}`);
	}
};
