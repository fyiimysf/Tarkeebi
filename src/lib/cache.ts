import { browser } from '$app/env';
import type {
	RecipeDetailData,
	RecipeIngredient,
	RecipeStep,
	RecipeSummaryData,
	RecipeTagRef
} from './types.ts';

/**
 * A tiny stale-while-revalidate cache for the authenticated app.
 *
 * Server loads are streamed, so a route renders immediately. When a cached
 * snapshot exists we show that instead of a skeleton; the streamed response
 * replaces it and refreshes localStorage. Everything stays scoped to the
 * signed-in user, and sign-out clears it.
 */
const VERSION = 1;
const CACHE_NAMESPACE = 'tarkeebi:cache:';
const PREFIX = `${CACHE_NAMESPACE}v${VERSION}:`;
const MAX_DETAILS = 24;

/**
 * Streamed loads can resolve after the user has already mutated a recipe
 * (favourite, publish, delete). A stale snapshot must never overwrite a newer
 * optimistic patch or resurrect a deleted recipe. Writers capture this
 * revision when they start and skip the write if anything changed meanwhile.
 */
let cacheRevision = 0;

export function currentCacheRevision(): number {
	return cacheRevision;
}

function bumpCacheRevision() {
	cacheRevision += 1;
}

type DashboardCache = {
	recipes: RecipeSummaryData[];
	tags: RecipeTagRef[];
	savedAt: number;
};

type StoredDashboard = {
	recipes: unknown[];
	tags: unknown[];
	savedAt: number;
};

type StoredDetail = {
	recipe: unknown;
	savedAt: number;
};

type StoredCache = {
	dashboard?: StoredDashboard;
	details?: Record<string, StoredDetail>;
};

function storageKey(userId: string) {
	return `${PREFIX}${userId}`;
}

function readStore(userId: string): StoredCache {
	if (!browser) return {};

	try {
		const raw = localStorage.getItem(storageKey(userId));
		if (!raw) return {};

		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

		const store = parsed as StoredCache;

		// localStorage is user-editable and may contain an older or corrupted
		// shape. Normalize the containers so mutations below can never throw.
		if (
			store.dashboard &&
			(typeof store.dashboard !== 'object' || Array.isArray(store.dashboard))
		) {
			delete store.dashboard;
		}
		if (store.details && (typeof store.details !== 'object' || Array.isArray(store.details))) {
			delete store.details;
		}

		return store;
	} catch {
		return {};
	}
}

function writeStore(userId: string, store: StoredCache) {
	if (!browser) return;

	try {
		localStorage.setItem(storageKey(userId), JSON.stringify(store));
	} catch {
		// A full quota is recoverable: keep the list, drop the heavier details.
		try {
			localStorage.setItem(
				storageKey(userId),
				JSON.stringify({ ...store, details: {} } satisfies StoredCache)
			);
		} catch {
			try {
				localStorage.removeItem(storageKey(userId));
			} catch {
				/* storage can be unavailable in private mode */
			}
		}
	}
}

function asDate(value: unknown): Date | null {
	if (value instanceof Date) return value;
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date;
	}
	return null;
}

function asNullableString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reviveTags(value: unknown): RecipeTagRef[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((entry) => {
		if (!entry || typeof entry !== 'object') return [];
		const tag = entry as Record<string, unknown>;
		if (typeof tag.name !== 'string' || typeof tag.slug !== 'string') return [];
		return [{ name: tag.name, slug: tag.slug }];
	});
}

function reviveIngredients(value: unknown): RecipeIngredient[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((entry) => {
		if (!entry || typeof entry !== 'object') return [];
		const ingredient = entry as Record<string, unknown>;
		if (typeof ingredient.id !== 'string' || typeof ingredient.name !== 'string') return [];
		return [
			{
				id: ingredient.id,
				quantity: asNullableString(ingredient.quantity),
				unit: asNullableString(ingredient.unit),
				name: ingredient.name,
				note: asNullableString(ingredient.note)
			}
		];
	});
}

function reviveSteps(value: unknown): RecipeStep[] {
	if (!Array.isArray(value)) return [];

	return value.flatMap((entry, index) => {
		if (!entry || typeof entry !== 'object') return [];
		const step = entry as Record<string, unknown>;
		if (typeof step.id !== 'string' || typeof step.instruction !== 'string') return [];
		return [
			{
				id: step.id,
				position: asNumber(step.position, index),
				instruction: step.instruction
			}
		];
	});
}

function reviveSummary(value: unknown): RecipeSummaryData | null {
	if (!value || typeof value !== 'object') return null;
	const recipe = value as Record<string, unknown>;
	if (typeof recipe.id !== 'string' || typeof recipe.title !== 'string') return null;

	const prepMinutes = asNullableNumber(recipe.prepMinutes);
	const cookMinutes = asNullableNumber(recipe.cookMinutes);

	return {
		id: recipe.id,
		title: recipe.title,
		description: asNullableString(recipe.description),
		imageUrl: asNullableString(recipe.imageUrl),
		servings: asNumber(recipe.servings, 1),
		prepMinutes,
		cookMinutes,
		isFavorite: recipe.isFavorite === true,
		isPublic: recipe.isPublic === true,
		notes: asNullableString(recipe.notes),
		cookedCount: asNumber(recipe.cookedCount),
		lastCookedAt: asDate(recipe.lastCookedAt),
		tags: reviveTags(recipe.tags),
		createdAt: asDate(recipe.createdAt) ?? new Date(0),
		totalMinutes: asNumber(recipe.totalMinutes, (prepMinutes ?? 0) + (cookMinutes ?? 0))
	};
}

function reviveDetail(value: unknown): RecipeDetailData | null {
	const summary = reviveSummary(value);
	if (!summary) return null;
	const recipe = value as Record<string, unknown>;

	return {
		...summary,
		publishedAt: asDate(recipe.publishedAt),
		slug: asNullableString(recipe.slug),
		sourceUrl: asNullableString(recipe.sourceUrl),
		myCookCount: asNumber(recipe.myCookCount),
		myLastCookedAt: asDate(recipe.myLastCookedAt),
		cookedCount: asNumber(recipe.cookedCount),
		lastCookedAt: asDate(recipe.lastCookedAt),
		tags: reviveTags(recipe.tags),
		ingredients: reviveIngredients(recipe.ingredients),
		steps: reviveSteps(recipe.steps)
	};
}

function serializeSummary(recipe: RecipeSummaryData) {
	return {
		...recipe,
		createdAt: recipe.createdAt.toISOString(),
		lastCookedAt: recipe.lastCookedAt?.toISOString() ?? null
	};
}

function serializeDetail(recipe: RecipeDetailData) {
	return {
		...recipe,
		createdAt: recipe.createdAt.toISOString(),
		publishedAt: recipe.publishedAt?.toISOString() ?? null,
		myLastCookedAt: recipe.myLastCookedAt?.toISOString() ?? null,
		lastCookedAt: recipe.lastCookedAt?.toISOString() ?? null
	};
}

function trimDetails(details: Record<string, StoredDetail>) {
	const entries = Object.entries(details)
		.filter(([, value]) => value && typeof value === 'object' && typeof value.savedAt === 'number')
		.sort((a, b) => b[1].savedAt - a[1].savedAt);
	return Object.fromEntries(entries.slice(0, MAX_DETAILS));
}

export function readDashboard(userId: string): DashboardCache | null {
	const stored = readStore(userId).dashboard;
	if (!stored || !Array.isArray(stored.recipes)) return null;

	const recipes = stored.recipes
		.map(reviveSummary)
		.filter((recipe): recipe is RecipeSummaryData => recipe !== null);

	return {
		recipes,
		tags: reviveTags(stored.tags),
		savedAt: asNumber(stored.savedAt)
	};
}

export function writeDashboard(
	userId: string,
	recipes: RecipeSummaryData[],
	tags: RecipeTagRef[]
): void {
	const store = readStore(userId);
	store.dashboard = {
		recipes: recipes.map(serializeSummary),
		tags,
		savedAt: Date.now()
	};
	writeStore(userId, store);
}

export function readRecipe(userId: string, recipeId: string): RecipeDetailData | null {
	const stored = readStore(userId).details?.[recipeId];
	if (!stored) return null;
	return reviveDetail(stored.recipe);
}

export function writeRecipe(userId: string, recipe: RecipeDetailData): void {
	const store = readStore(userId);
	const details = store.details ?? {};
	details[recipe.id] = { recipe: serializeDetail(recipe), savedAt: Date.now() };
	store.details = trimDetails(details);
	writeStore(userId, store);
}

export function upsertDashboardRecipe(userId: string, recipe: RecipeSummaryData): void {
	const store = readStore(userId);
	if (!store.dashboard) return;

	const recipes = (Array.isArray(store.dashboard.recipes) ? store.dashboard.recipes : [])
		.map(reviveSummary)
		.filter((entry): entry is RecipeSummaryData => entry !== null);
	const index = recipes.findIndex((entry) => entry.id === recipe.id);
	if (index === -1) recipes.unshift(recipe);
	else recipes[index] = recipe;

	store.dashboard.recipes = recipes.map(serializeSummary);
	store.dashboard.savedAt = Date.now();
	writeStore(userId, store);
}

export function patchCachedRecipe(
	userId: string,
	recipeId: string,
	patch: Partial<RecipeDetailData> & Partial<RecipeSummaryData>
): void {
	const store = readStore(userId);

	if (store.dashboard) {
		store.dashboard.recipes = (Array.isArray(store.dashboard.recipes) ? store.dashboard.recipes : [])
			.map(reviveSummary)
			.filter((entry): entry is RecipeSummaryData => entry !== null)
			.map((entry) => {
				if (entry.id !== recipeId) return entry;
				const next = { ...entry, ...patch };
				return {
					...next,
					totalMinutes: (next.prepMinutes ?? 0) + (next.cookMinutes ?? 0)
				};
			})
			.map(serializeSummary);
	}

	const storedDetail = store.details?.[recipeId];
	if (storedDetail) {
		const current = reviveDetail(storedDetail.recipe);
		if (current) {
			store.details![recipeId] = {
				recipe: serializeDetail({ ...current, ...patch }),
				savedAt: Date.now()
			};
		}
	}

	bumpCacheRevision();
	writeStore(userId, store);
}

export function removeCachedRecipe(userId: string, recipeId: string): void {
	const store = readStore(userId);
	if (store.dashboard) {
		store.dashboard.recipes = (Array.isArray(store.dashboard.recipes) ? store.dashboard.recipes : [])
			.map(reviveSummary)
			.filter((entry): entry is RecipeSummaryData => entry !== null && entry.id !== recipeId)
			.map(serializeSummary);
	}
	if (store.details) delete store.details[recipeId];
	bumpCacheRevision();
	writeStore(userId, store);
}

/** Sign-out is a privacy boundary, not just a UI reset. */
export function clearAllCaches(): void {
	bumpCacheRevision();
	if (!browser) return;

	try {
		const keys: string[] = [];
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key?.startsWith(CACHE_NAMESPACE)) keys.push(key);
		}
		for (const key of keys) localStorage.removeItem(key);
	} catch {
		/* storage can be unavailable in private mode */
	}
}

export function summaryFromDetail(recipe: RecipeDetailData): RecipeSummaryData {
	return {
		id: recipe.id,
		title: recipe.title,
		description: recipe.description,
		imageUrl: recipe.imageUrl,
		servings: recipe.servings,
		prepMinutes: recipe.prepMinutes,
		cookMinutes: recipe.cookMinutes,
		isFavorite: recipe.isFavorite,
		isPublic: recipe.isPublic,
		notes: recipe.notes,
		cookedCount: recipe.cookedCount,
		lastCookedAt: recipe.lastCookedAt,
		tags: recipe.tags,
		createdAt: recipe.createdAt,
		totalMinutes: (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
	};
}
