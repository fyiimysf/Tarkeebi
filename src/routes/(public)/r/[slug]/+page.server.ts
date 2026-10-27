import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { getCookStats, recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, getClientAddress }) => {
	const content = loadPublicRecipe(params.slug, getClientAddress());
	content.catch(() => {});

	return { content };
};

async function loadPublicRecipe(slug: string, clientAddress: string) {
	const db = getDb(env.DB);

	const found = await db.query.recipe.findFirst({
		// Any recipe with a slug is reachable by its link, public or private.
		// Private ones are simply never listed on the home page.
		where: (table, { eq }) => eq(table.slug, slug),
		with: {
			ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
			steps: { orderBy: (step, { asc }) => [asc(step.position)] },
			user: { columns: { name: true } },
			recipeTags: { with: { tag: { columns: { name: true, slug: true } } } }
		}
	});

	if (!found) error(404, 'Recipe not found');

	const identity = await visitorIdentity(() => clientAddress);
	const cookStats = await getCookStats(found.id, identity);

	return {
		recipe: {
			id: found.id,
			slug: found.slug ?? slug,
			title: found.title,
			description: found.description,
			notes: found.notes,
			imageUrl: found.imageUrl,
			servings: found.servings,
			prepMinutes: found.prepMinutes,
			cookMinutes: found.cookMinutes,
			publishedAt: found.publishedAt,
			sourceUrl: found.sourceUrl,
			isPublic: found.isPublic,
			cookCount: cookStats.count,
			authorName: found.user?.name ?? null,
			tags: found.recipeTags.map((link) => link.tag),
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
	// Taps are tallied against the visitor's salted address hash, so every
	// person — owner or link-holder — keeps their own private count.
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
