import { env } from 'cloudflare:workers';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getCookStats, recordCook, visitorIdentity } from '#lib/server/cooked.ts';
import { getDb } from '#lib/server/db/index.ts';
import { recipe } from '#lib/server/db/schema.ts';
import { resolveRecipeContent } from '#lib/server/recipe-i18n.ts';
import { uniqueRecipeSlug } from '#lib/server/slug.ts';
import { deleteRecipeImage } from '#lib/server/storage.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, getClientAddress }) => {
	// Return the promise instead of awaiting it: SvelteKit streams the recipe to
	// the browser, so the route shell (and its cached fallback) can render now.
	const recipePromise = loadRecipe(params.id, locals.user!.id, getClientAddress);
	recipePromise.catch(() => {});
	return { recipe: recipePromise };
};

async function loadRecipe(recipeId: string, userId: string, getClientAddress: () => string) {
	const db = getDb(env.DB);
	const locale = getLocale();

	const found = await db.query.recipe.findFirst({
		where: (table, { and, eq }) => and(eq(table.id, recipeId), eq(table.userId, userId)),
		with: {
			ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
			steps: { orderBy: (step, { asc }) => [asc(step.position)] },
			recipeTags: { with: { tag: true } }
		}
	});

	if (!found) error(404, 'Recipe not found');

	const identity = await visitorIdentity(getClientAddress);
	const cookStats = await getCookStats(found.id, identity);
	const resolved = await resolveRecipeContent(db, found as any, locale);

	return {
		id: resolved.id,
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
		isFavorite: resolved.isFavorite,
		isPublic: resolved.isPublic,
		publishedAt: resolved.publishedAt,
		slug: resolved.slug,
		sourceUrl: resolved.sourceUrl,
		myCookCount: cookStats.count,
		myLastCookedAt: cookStats.lastCookedAt,
		cookedCount: resolved.cookedCount,
		lastCookedAt: resolved.lastCookedAt,
		createdAt: resolved.createdAt,
		tags: found.recipeTags.map(({ tag }) => ({ name: tag.name, slug: tag.slug })),
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
	};
}

export const actions: Actions = {
	toggleFavorite: async ({ params, locals }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true, isFavorite: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		await db
			.update(recipe)
			.set({ isFavorite: !current.isFavorite })
			.where(and(eq(recipe.id, params.id), eq(recipe.userId, locals.user!.id)));

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true, imageKey: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		await db
			.delete(recipe)
			.where(and(eq(recipe.id, params.id), eq(recipe.userId, locals.user!.id)));

		if (current.imageKey) await deleteRecipeImage(current.imageKey);

		redirect(302, '/app');
	},

	markCooked: async ({ params, locals, getClientAddress }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		const identity = await visitorIdentity(getClientAddress);

		return { success: true, cookedCount: await recordCook(current.id, identity) };
	},

	/**
	 * Give a recipe a shareable slug without publishing it, so private recipes
	 * can be shared by link.
	 */
	ensureSlug: async ({ params, locals }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true, title: true, slug: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		const slug = current.slug ?? (await uniqueRecipeSlug(db, current.title));
		if (!current.slug) {
			await db
				.update(recipe)
				.set({ slug })
				.where(and(eq(recipe.id, params.id), eq(recipe.userId, locals.user!.id)));
		}

		return { success: true, slug };
	},

	togglePublished: async ({ params, locals }) => {
		const db = getDb(env.DB);

		const current = await db.query.recipe.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, params.id), eq(table.userId, locals.user!.id)),
			columns: { id: true, title: true, slug: true, isPublic: true }
		});

		if (!current) return fail(404, { message: 'Recipe not found' });

		if (current.isPublic) {
			await db
				.update(recipe)
				.set({ isPublic: false, publishedAt: null })
				.where(and(eq(recipe.id, params.id), eq(recipe.userId, locals.user!.id)));
		} else {
			const slug = current.slug ?? (await uniqueRecipeSlug(db, current.title));
			await db
				.update(recipe)
				.set({ isPublic: true, slug, publishedAt: new Date() })
				.where(and(eq(recipe.id, params.id), eq(recipe.userId, locals.user!.id)));
		}

		return { success: true };
	}
};
