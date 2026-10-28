import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import { resolveRecipeContent } from '#lib/server/recipe-i18n.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb(env.DB);
	const locale = getLocale();

	const found = await db.query.recipe.findFirst({
		// Cook mode follows the same reachability rule as the recipe page: a
		// shared link works whether or not the recipe is published.
		where: (table, { eq }) => eq(table.slug, params.slug),
		with: {
			ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
			steps: { orderBy: (step, { asc }) => [asc(step.position)] }
		}
	});

	if (!found) error(404, 'Recipe not found');

	const resolved = await resolveRecipeContent(db, found as any, locale);

	return {
		recipe: {
			id: resolved.id,
			slug: resolved.slug ?? params.slug,
			title: resolved.title,
			servings: resolved.servings,
			ingredients: resolved.ingredients.map((ing: any) => ({
				id: ing.id,
				quantity: ing.quantity,
				unit: ing.unit,
				name: ing.name,
				note: ing.note
			})),
			steps: resolved.steps.map((st: any) => ({
				id: st.id,
				position: st.position,
				instruction: st.instruction
			}))
		}
	};
};

export const actions: Actions = {
	markCooked: async ({ params, getClientAddress }) => {
		const db = getDb(env.DB);

		const found = await db.query.recipe.findFirst({
			where: (table, { eq }) => eq(table.slug, params.slug),
			columns: { id: true }
		});

		if (!found) error(404, 'Recipe not found');

		const identity = await visitorIdentity(getClientAddress);

		return { success: true, cookedCount: await recordCook(found.id, identity) };
	}
};
