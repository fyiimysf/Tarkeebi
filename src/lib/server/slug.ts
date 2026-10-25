import { like } from 'drizzle-orm';
import type { getDb } from './db/index.ts';
import { recipe } from './db/schema.ts';

type Db = ReturnType<typeof getDb>;

/**
 * Turn a recipe title into a URL-safe slug. Non-Latin titles fall back to
 * "recipe", which keeps shared links stable and readable.
 */
export function slugify(input: string): string {
	return (
		input
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'recipe'
	);
}

/**
 * Find a slug that is not already used by another recipe.
 */
export async function uniqueRecipeSlug(db: Db, title: string): Promise<string> {
	const base = slugify(title);
	const rows = await db
		.select({ slug: recipe.slug })
		.from(recipe)
		.where(like(recipe.slug, `${base}%`));

	const taken = new Set(rows.map((row) => row.slug).filter((slug): slug is string => !!slug));

	if (!taken.has(base)) return base;

	let suffix = 2;
	while (taken.has(`${base}-${suffix}`)) suffix += 1;
	return `${base}-${suffix}`;
}
