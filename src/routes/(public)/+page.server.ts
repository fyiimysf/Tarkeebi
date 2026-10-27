import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { recipe } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const activeTag = url.searchParams.get('tag')?.trim() ?? '';
	const query = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	const content = loadPublicHome(activeTag, query);
	content.catch(() => {});

	return { content, activeTag, query };
};

async function loadPublicHome(activeTag: string, query: string) {
	const db = getDb(env.DB);

	const rows = await db.query.recipe.findMany({
		where: eq(recipe.isPublic, true),
		with: {
			recipeTags: { with: { tag: { columns: { name: true, slug: true } } } }
		}
	});

	const all = rows
		.filter((row) => row.slug)
		.map((row) => ({
			id: row.id,
			slug: row.slug as string,
			title: row.title,
			description: row.description,
			imageUrl: row.imageUrl,
			servings: row.servings,
			prepMinutes: row.prepMinutes,
			cookMinutes: row.cookMinutes,
			publishedAt: row.publishedAt,
			tags: row.recipeTags.map((link) => link.tag)
		}))
		.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));

	const tagCounts = new Map<string, { name: string; slug: string; count: number }>();
	for (const row of all) {
		for (const item of row.tags) {
			const existing = tagCounts.get(item.slug);
			if (existing) existing.count += 1;
			else tagCounts.set(item.slug, { ...item, count: 1 });
		}
	}
	const tags = [...tagCounts.values()].sort((a, b) => b.count - a.count);

	let recipes = activeTag ? all.filter((row) => row.tags.some((item) => item.slug === activeTag)) : all;

	if (query) {
		recipes = recipes.filter((row) => {
			const haystack = [row.title, row.description ?? '']
				.concat(row.tags.map((tag) => tag.name))
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		});
	}

	const featured = activeTag || query ? null : (recipes[0] ?? null);
	const rest = activeTag || query ? recipes : recipes.slice(1);
	const activeTagName = activeTag ? (tagCounts.get(activeTag)?.name ?? null) : null;

	return { recipes: rest, featured, tags, activeTag, activeTagName, total: all.length, query };
}
