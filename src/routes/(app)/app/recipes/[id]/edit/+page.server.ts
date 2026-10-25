import { env } from 'cloudflare:workers';
import { and, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
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

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = getDb(env.DB);

	const found = await db.query.recipe.findFirst({
		where: (table, { and, eq }) =>
			and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
		with: {
			ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
			steps: { orderBy: (step, { asc }) => [asc(step.position)] },
			recipeTags: { with: { tag: true } }
		}
	});

	if (!found) error(404, 'Recipe not found');

	return {
		recipe: {
			id: found.id,
			title: found.title,
			description: found.description,
			notes: found.notes,
			imageUrl: found.imageUrl,
			servings: found.servings,
			prepMinutes: found.prepMinutes,
			cookMinutes: found.cookMinutes,
			sourceUrl: found.sourceUrl,
			isPublic: found.isPublic,
			tags: found.recipeTags.map(({ tag }) => tag.name),
			ingredients: found.ingredients.map(({ quantity, unit, name, note }) => ({
				quantity: quantity ?? '',
				unit: unit ?? '',
				name,
				note: note ?? ''
			})),
			steps: found.steps.map(({ instruction }) => ({ instruction }))
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const db = getDb(env.DB);
		const form = await request.formData();
		const fields = parseRecipeFields(form);

		if (!fields.title) {
			return fail(400, { message: 'A title is required.', title: '' });
		}

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true, imageKey: true, slug: true, isPublic: true, publishedAt: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		const userId = locals.user!.id;
		const ingredients = parseIngredients(form);
		const steps = parseSteps(form);
		const removeImage = form.get('removeImage') === 'on';

		const image = form.get('image');
		let uploaded: { key: string; url: string } | null = null;

		if (image instanceof File && image.size > 0) {
			try {
				uploaded = await uploadRecipeImage(image, userId);
			} catch (uploadError) {
				return fail(400, {
					message:
						uploadError instanceof ImageUploadError
							? uploadError.message
							: 'The image could not be uploaded. Please try again.',
					title: fields.title
				});
			}
		}

		try {
			// The slug is stable once created; visibility only decides whether
			// the recipe is listed on the public home page.
			const isPublic = fields.isPublic;
			const slug = current.slug ?? (isPublic ? await uniqueRecipeSlug(db, fields.title) : null);

			await db
				.update(recipe)
				.set({
					title: fields.title,
					description: fields.description,
					notes: fields.notes,
					servings: fields.servings,
					prepMinutes: fields.prepMinutes,
					cookMinutes: fields.cookMinutes,
					sourceUrl: fields.sourceUrl,
					imageUrl: uploaded?.url ?? (removeImage ? null : undefined),
					imageKey: uploaded?.key ?? (removeImage ? null : undefined),
					slug,
					isPublic,
					publishedAt: isPublic ? (current.publishedAt ?? new Date()) : null
				})
				.where(and(eq(recipe.id, params.id), eq(recipe.userId, userId)));

			await replaceRecipeIngredients(db, params.id, ingredients);
			await replaceRecipeSteps(db, params.id, steps);
			await replaceRecipeTags(db, params.id, userId, fields.tags);
		} catch (updateError) {
			if (uploaded) await deleteRecipeImage(uploaded.key);
			throw updateError;
		}

		if (current.imageKey && (uploaded || removeImage)) {
			await deleteRecipeImage(current.imageKey);
		}

		redirect(302, `/app/recipes/${params.id}`);
	}
};
