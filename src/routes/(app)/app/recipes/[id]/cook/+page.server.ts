import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = getDb(env.DB);

	const found = await db.query.recipe.findFirst({
		where: (table, { and, eq }) => and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
		with: {
			ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
			steps: { orderBy: (step, { asc }) => [asc(step.position)] }
		}
	});

	if (!found) error(404, 'Recipe not found');

	return {
		recipe: {
			id: found.id,
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
	markCooked: async ({ params, locals, getClientAddress }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true }
		});

		if (!current) error(404, 'Recipe not found');

		const identity = await visitorIdentity(getClientAddress);

		// Stay in cook mode and hand the fresh tally back so the UI can confirm it.
		return { success: true, cookedCount: await recordCook(current.id, identity) };
	}
};
