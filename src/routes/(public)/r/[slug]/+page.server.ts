import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { getCookStats, recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import { resolveRecipeContent } from '#lib/server/recipe-i18n.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, getClientAddress }) => {
	const content = loadPublicRecipe(params.slug, getClientAddress());
	content.catch(() => {});

	return { content };
};

async function loadPublicRecipe(slug: string, clientAddress: string) {
	const db = getDb(env.DB);
	const locale = getLocale();

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
	const resolved = await resolveRecipeContent(db, found as any, locale);

	return {
		recipe: {
			id: resolved.id,
			slug: resolved.slug ?? slug,
			locale: resolved.locale,
			resolvedLocale: resolved.resolvedLocale,
			originalLocale: resolved.originalLocale,
			isTranslated: resolved.isTranslated,
			title: resolved.title,
			description: resolved.description,
			notes: resolved.notes,
			imageUrl: resolved.imageUrl,
			servings: resolved.servings,
			prepMinutes: resolved.prepMinutes,
			cookMinutes: resolved.cookMinutes,
			publishedAt: resolved.publishedAt,
			sourceUrl: resolved.sourceUrl,
			isPublic: resolved.isPublic,
			cookCount: cookStats.count,
			authorName: found.user?.name ?? null,
			tags: found.recipeTags.map((link) => link.tag),
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
