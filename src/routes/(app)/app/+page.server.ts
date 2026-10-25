import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { recipe, tag } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = getDb(env.DB);
	const userId = locals.user!.id;

	// The dashboard fetches the full (summary-sized) list once and filters it in
	// the browser. Search, filters and sorting then update instantly without a
	// server round-trip. Returning every summary also makes the no-JS form work:
	// the first render reads the request URL and filters on the server.
	const rows = await db.query.recipe.findMany({
		where: eq(recipe.userId, userId),
		with: {
			recipeTags: { with: { tag: { columns: { name: true, slug: true } } } }
		}
	});

	const recipes = rows.map((row) => ({
		id: row.id,
		title: row.title,
		description: row.description,
		imageUrl: row.imageUrl,
		servings: row.servings,
		prepMinutes: row.prepMinutes,
		cookMinutes: row.cookMinutes,
		isFavorite: row.isFavorite,
		isPublic: row.isPublic,
		notes: row.notes,
		cookedCount: row.cookedCount,
		lastCookedAt: row.lastCookedAt,
		createdAt: row.createdAt,
		totalMinutes: (row.prepMinutes ?? 0) + (row.cookMinutes ?? 0),
		tags: row.recipeTags.map((link) => link.tag)
	}));

	const tagRows = await db
		.select({ name: tag.name, slug: tag.slug })
		.from(tag)
		.where(eq(tag.userId, userId));

	return { recipes, tags: tagRows };
};
