import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { BETTER_AUTH_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.ts';
import { cookLog, recipe } from '#lib/server/db/schema.ts';

export type CookStats = {
	count: number;
	lastCookedAt: Date | null;
};

/**
 * A stable, privacy-preserving key for a visitor. The address itself is never
 * stored: it is salted with the app secret and hashed before it touches the DB.
 * The same person gets the same tally on the public page and inside the app.
 */
export async function visitorIdentity(getClientAddress: () => string): Promise<string> {
	let address = 'unknown';

	try {
		address = getClientAddress() || 'unknown';
	} catch {
		// Some runtimes cannot report an address; fall back to one shared bucket.
	}

	const bytes = new TextEncoder().encode(`${BETTER_AUTH_SECRET ?? 'tarkeebi'}:${address}`);
	const digest = await crypto.subtle.digest('SHA-256', bytes);

	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** How many times this visitor has cooked the recipe. */
export async function getCookStats(recipeId: string, identity: string): Promise<CookStats> {
	const db = getDb(env.DB);

	const row = await db.query.cookLog.findFirst({
		where: (table, { and, eq }) => and(eq(table.recipeId, recipeId), eq(table.identity, identity)),
		columns: { count: true, lastCookedAt: true }
	});

	return { count: row?.count ?? 0, lastCookedAt: row?.lastCookedAt ?? null };
}

/**
 * Record a cook for one visitor in a single upsert, so concurrent taps cannot
 * clobber each other, and return the visitor's fresh personal tally. The recipe
 * keeps an aggregate count for the dashboard and sorting; the number shown next
 * to "I cooked this" is always the visitor's own.
 */
export async function recordCook(recipeId: string, identity: string): Promise<number | null> {
	const db = getDb(env.DB);
	const now = new Date();

	const [updated] = await db
		.insert(cookLog)
		.values({ recipeId, identity, count: 1, firstCookedAt: now, lastCookedAt: now })
		.onConflictDoUpdate({
			target: [cookLog.recipeId, cookLog.identity],
			set: { count: sql`${cookLog.count} + 1`, lastCookedAt: now }
		})
		.returning({ count: cookLog.count });

	await db
		.update(recipe)
		.set({ cookedCount: sql`${recipe.cookedCount} + 1`, lastCookedAt: now })
		.where(eq(recipe.id, recipeId));

	return updated?.count ?? null;
}
