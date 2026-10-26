import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { recipe, tag } from '#lib/server/db/schema.ts';
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

	const [rows, tagRows] = await Promise.all([
		db.query.recipe.findMany({
			where: eq(recipe.userId, userId),
			with: {
				recipeTags: { with: { tag: { columns: { name: true, slug: true } } } }
			}
		}),
		db.select({ name: tag.name, slug: tag.slug }).from(tag).where(eq(tag.userId, userId))
	]);

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

	return { recipes, tags: tagRows };
}
