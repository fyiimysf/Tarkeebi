import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { recipe } from '#lib/server/db/schema.ts';

export type RecipeStats = {
	recipes: number;
	favorites: number;
	published: number;
	cooked: number;
};

/** Single pass over the user's recipes; powers the dashboard and the sidebar. */
export async function getRecipeStats(db: D1Database, userId: string): Promise<RecipeStats> {
	const rows = await getDb(db).query.recipe.findMany({
		where: eq(recipe.userId, userId),
		columns: { isFavorite: true, isPublic: true, cookedCount: true }
	});

	return {
		recipes: rows.length,
		favorites: rows.filter((row) => row.isFavorite).length,
		published: rows.filter((row) => row.isPublic).length,
		cooked: rows.reduce((sum, row) => sum + row.cookedCount, 0)
	};
}
