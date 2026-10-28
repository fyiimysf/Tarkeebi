import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { recipe, tag } from '#lib/server/db/schema.ts';
import { resolveRecipeContent } from '#lib/server/recipe-i18n.ts';
import { getLocale } from '#lib/paraglide/runtime.js';
import type { DashboardContentData } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	// The dashboard fetches the full (summary-sized) list once and filters it in
	// the browser. Search, filters and sorting then update instantly without a
	// server round-trip. Returning the promise lets the route shell and cached
	// snapshot paint while the list streams in.
	const content = loadDashboard(locals.user!.id);
	content.catch(() => {});
	return { content };
};

async function loadDashboard(userId: string): Promise<DashboardContentData> {
	const db = getDb(env.DB);
	const locale = getLocale();

	const [rows, tagRows] = await Promise.all([
		db.query.recipe.findMany({
			where: eq(recipe.userId, userId),
			with: {
				ingredients: { orderBy: (ingredient, { asc }) => [asc(ingredient.position)] },
				steps: { orderBy: (step, { asc }) => [asc(step.position)] },
				recipeTags: { with: { tag: { columns: { name: true, slug: true } } } }
			}
		}),
		db.select({ name: tag.name, slug: tag.slug }).from(tag).where(eq(tag.userId, userId))
	]);

	const recipes = await Promise.all(
		rows.map(async (row) => {
			const resolved = await resolveRecipeContent(db, row as any, locale);
			return {
				id: resolved.id,
				title: resolved.title,
				description: resolved.description,
				imageUrl: resolved.imageUrl,
				servings: resolved.servings,
				prepMinutes: resolved.prepMinutes,
				cookMinutes: resolved.cookMinutes,
				isFavorite: resolved.isFavorite,
				isPublic: resolved.isPublic,
				notes: resolved.notes,
				cookedCount: resolved.cookedCount,
				lastCookedAt: resolved.lastCookedAt,
				createdAt: resolved.createdAt,
				totalMinutes: (resolved.prepMinutes ?? 0) + (resolved.cookMinutes ?? 0),
				tags: row.recipeTags.map((link) => link.tag)
			};
		})
	);

	return { recipes, tags: tagRows };
}
