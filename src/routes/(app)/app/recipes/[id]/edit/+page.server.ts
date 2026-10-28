import { env } from 'cloudflare:workers';
import { and, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { ingredientTranslation, recipe, recipeTranslation, stepTranslation } from '#lib/server/db/schema.ts';
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
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = getDb(env.DB);

	const found = await db.query.recipe.findFirst({
		where: (table, { and, eq }) =>
			and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
		with: {
			ingredients: {
				orderBy: (ingredient, { asc }) => [asc(ingredient.position)],
				with: { translations: true }
			},
			steps: {
				orderBy: (step, { asc }) => [asc(step.position)],
				with: { translations: true }
			},
			recipeTags: { with: { tag: true } },
			translations: true
		}
	});

	if (!found) error(404, 'Recipe not found');

	const currentLocale = getLocale();

	return {
		recipe: {
			id: found.id,
			locale: found.locale,
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
			ingredients: found.ingredients.map(({ id, quantity, unit, name, note }) => ({
				id,
				quantity: quantity ?? '',
				unit: unit ?? '',
				name,
				note: note ?? ''
			})),
			steps: found.steps.map(({ id, instruction }) => ({ id, instruction }))
		},
		translations: (found.translations || []).map((t) => ({
			locale: t.locale,
			title: t.title ?? '',
			description: t.description ?? '',
			notes: t.notes ?? ''
		})),
		translationEntities: {
			ingredients: found.ingredients.map((ing) => {
				const t = (ing as any).translations?.find((tr: any) => tr.locale === currentLocale);
				return {
					id: ing.id,
					name: ing.name,
					note: ing.note ?? '',
					translationName: t?.name ?? '',
					translationNote: t?.note ?? '',
					translation: t
						? {
								locale: t.locale,
								name: t.name ?? '',
								note: t.note ?? ''
							}
						: null
				};
			}),
			steps: found.steps.map((step) => {
				const t = (step as any).translations?.find((tr: any) => tr.locale === currentLocale);
				return {
					id: step.id,
					instruction: step.instruction,
					translationInstruction: t?.instruction ?? '',
					translation: t
						? {
								locale: t.locale,
								instruction: t.instruction ?? ''
							}
						: null
				};
			})
		},
		availableLocales: ['en', 'id', 'ur']
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const db = getDb(env.DB);
		const form = await request.formData();
		const fields = parseRecipeFields(form);

		if (!fields.title || !fields.title.trim()) {
			// Use original title if only translating
			const current = await db.query.recipe.findFirst({
				where: (table, { and, eq }) => and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
				columns: { title: true }
			});
			if (!current?.title) {
				return fail(400, { message: 'A title is required.', title: '' });
			}
			fields.title = current.title;
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

			// Save recipe-level translations (optional) before replacing ingredients/steps
			const translationLocales = ['en', 'id', 'ur'];
			for (const tLocale of translationLocales) {
				const tTitle = form.get(`trans_${tLocale}_title`);
				const tDesc = form.get(`trans_${tLocale}_description`);
				const tNotes = form.get(`trans_${tLocale}_notes`);
				if (tTitle === null && tDesc === null && tNotes === null) {
					continue;
				}
				const titleStr = tTitle?.toString().trim() ?? '';
				const descStr = tDesc?.toString().trim() ?? '';
				const notesStr = tNotes?.toString().trim() ?? '';
				if (titleStr || descStr || notesStr) {
					await db
						.insert(recipeTranslation)
						.values({
							recipeId: params.id,
							locale: tLocale,
							title: titleStr || null,
							description: descStr || null,
							notes: notesStr || null
						})
						.onConflictDoUpdate({
							target: [recipeTranslation.recipeId, recipeTranslation.locale],
							set: {
								title: titleStr || null,
								description: descStr || null,
								notes: notesStr || null
							}
						});
				}
			}

			// Save ingredient/step translations keyed by original entity ids (before replacement cascades delete)
			const ingredientIds = form.getAll('ingredientId');
			const stepIds = form.getAll('stepId');
			const ingredientTranslationsToSave: Array<{ ingredientId: string; locale: string; name: string | null; note: string | null }> = [];
			const stepTranslationsToSave: Array<{ stepId: string; locale: string; instruction: string | null }> = [];
			for (const tLocale of translationLocales) {
				for (let i = 0; i < ingredientIds.length; i++) {
					const ingId = ingredientIds[i]?.toString();
					if (!ingId) continue;
					const nameT = form.get(`ing_${i}_${tLocale}_name`);
					const noteT = form.get(`ing_${i}_${tLocale}_note`);
					if (nameT === null && noteT === null) continue;
					const nameStr = nameT?.toString().trim() ?? '';
					const noteStr = noteT?.toString().trim() ?? '';
					if (nameStr || noteStr) {
						ingredientTranslationsToSave.push({ ingredientId: ingId, locale: tLocale, name: nameStr || null, note: noteStr || null });
					}
				}
				for (let i = 0; i < stepIds.length; i++) {
					const stepId = stepIds[i]?.toString();
					if (!stepId) continue;
					const instT = form.get(`step_${i}_${tLocale}_instruction`);
					if (instT === null) continue;
					const instStr = instT?.toString().trim() ?? '';
					if (instStr) {
						stepTranslationsToSave.push({ stepId: stepId, locale: tLocale, instruction: instStr || null });
					}
				}
			}

			await replaceRecipeIngredients(db, params.id, ingredients);
			await replaceRecipeSteps(db, params.id, steps);
			await replaceRecipeTags(db, params.id, userId, fields.tags);

			// Restore translations for new ingredient/step IDs by index
			const newIngredientIds = form.getAll('ingredientId');
			const newStepIds = form.getAll('stepId');
			// But after replace, form still has old hidden inputs? The form in browser will have old values unless regenerated; better to map by position from parsed arrays
			// Actually we can't rely on old form IDs after replacement - we need to map by index
			// Build maps from old index to saved translations
			const ingTransByOldIndex = new Map<string, Array<{ locale: string; name: string | null; note: string | null }>>();
			for (const tLocale of translationLocales) {
				for (let i = 0; i < ingredientIds.length; i++) {
					const ingId = ingredientIds[i]?.toString();
					if (!ingId) continue;
					const nameT = form.get(`ing_${i}_${tLocale}_name`);
					const noteT = form.get(`ing_${i}_${tLocale}_note`);
					if (nameT === null && noteT === null) continue;
					const nameStr = nameT?.toString().trim() ?? '';
					const noteStr = noteT?.toString().trim() ?? '';
					if (nameStr || noteStr) {
						if (!ingTransByOldIndex.has(i.toString())) ingTransByOldIndex.set(i.toString(), []);
						ingTransByOldIndex.get(i.toString())!.push({ locale: tLocale, name: nameStr || null, note: noteStr || null });
					}
				}
			}
			const stepTransByOldIndex = new Map<string, Array<{ locale: string; instruction: string | null }>>();
			for (const tLocale of translationLocales) {
				for (let i = 0; i < stepIds.length; i++) {
					const stepId = stepIds[i]?.toString();
					if (!stepId) continue;
					const instT = form.get(`step_${i}_${tLocale}_instruction`);
					if (instT === null) continue;
					const instStr = instT?.toString().trim() ?? '';
					if (instStr) {
						if (!stepTransByOldIndex.has(i.toString())) stepTransByOldIndex.set(i.toString(), []);
						stepTransByOldIndex.get(i.toString())!.push({ locale: tLocale, instruction: instStr || null });
					}
				}
			}

			// Get newly inserted ingredients/steps in order
			const insertedIngredients = await db.query.ingredient.findMany({
				where: (t, { eq }) => eq(t.recipeId, params.id),
				orderBy: (t, { asc }) => [asc(t.position)]
			});
			const insertedSteps = await db.query.step.findMany({
				where: (t, { eq }) => eq(t.recipeId, params.id),
				orderBy: (t, { asc }) => [asc(t.position)]
			});

			for (let i = 0; i < insertedIngredients.length; i++) {
				const ing = insertedIngredients[i];
				const trans = ingTransByOldIndex.get(i.toString()) || [];
				for (const tr of trans) {
					await db
						.insert(ingredientTranslation)
						.values({ ingredientId: ing.id, locale: tr.locale, name: tr.name, note: tr.note })
						.onConflictDoUpdate({
							target: [ingredientTranslation.ingredientId, ingredientTranslation.locale],
							set: { name: tr.name, note: tr.note }
						});
				}
			}
			for (let i = 0; i < insertedSteps.length; i++) {
				const st = insertedSteps[i];
				const trans = stepTransByOldIndex.get(i.toString()) || [];
				for (const tr of trans) {
					await db
						.insert(stepTranslation)
						.values({ stepId: st.id, locale: tr.locale, instruction: tr.instruction })
						.onConflictDoUpdate({
							target: [stepTranslation.stepId, stepTranslation.locale],
							set: { instruction: tr.instruction }
						});
				}
			}
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
