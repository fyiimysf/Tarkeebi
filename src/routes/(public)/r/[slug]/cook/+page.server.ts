import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb(env.DB);

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

	return {
		recipe: {
			id: found.id,
			slug: found.slug ?? params.slug,
			title: found.title,
			servings: found.servings,
			ingredients: found.ingredients.map(({ id, quantity, unit, name, note }) => ({
				id,
				quantity,
				unit,
				name,
				note
			})),
			steps: found.steps.map(({ id, position, instruction }) => ({
				id,
				position,
				instruction
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
