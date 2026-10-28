import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import { resolveRecipeContent } from '#lib/server/recipe-i18n.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = getDb(env.DB);
	const locale = getLocale();

	const found = await db.query.recipe.findFirst({
		where: (table, { and, eq }) => and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
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
