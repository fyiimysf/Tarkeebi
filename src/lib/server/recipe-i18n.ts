import { and, eq, inArray } from 'drizzle-orm';
import type { getDb } from '#lib/server/db/index.ts';
import {
	ingredient,
	ingredientTranslation,
	recipe,
	recipeTranslation,
	step,
	stepTranslation
} from '#lib/server/db/schema.ts';

type Db = ReturnType<typeof getDb>;

export type ResolvedIngredient = {
	id: string;
	position: number;
	quantity: string | null;
	unit: string | null;
	name: string;
	note: string | null;
};

export type ResolvedStep = {
	id: string;
	position: number;
	instruction: string;
};

export type ResolvedRecipeBase = {
	id: string;
	locale: string;
	title: string;
	description: string | null;
	notes: string | null;
	imageUrl: string | null;
	imageKey?: string | null;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	sourceUrl: string | null;
	isFavorite?: boolean;
	isPublic?: boolean;
	publishedAt?: Date | null;
	slug?: string | null;
	userId?: string;
	cookedCount?: number;
	lastCookedAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
};

export async function resolveRecipeContent<T extends ResolvedRecipeBase>(
	db: Db,
	recipeRow: T & {
		ingredients: Array<{
			id: string;
			position: number;
			quantity: string | null;
			unit: string | null;
			name: string;
			note: string | null;
		}>;
		steps: Array<{ id: string; position: number; instruction: string }>;
	},
	requestedLocale: string
) {
	const recipeId = recipeRow.id;
	const fallbackLocale = recipeRow.locale || 'en';
	const locale = requestedLocale && requestedLocale.trim() ? requestedLocale : fallbackLocale;

	let recipeTrans = null;
	recipeTrans = await db.query.recipeTranslation.findFirst({
		where: (table, { and, eq }) => and(eq(table.recipeId, recipeId), eq(table.locale, locale))
	});

	const title = recipeTrans?.title?.trim() || recipeRow.title;
	const description =
		recipeTrans?.description === undefined || recipeTrans?.description === null
			? recipeRow.description
			: recipeTrans.description.trim() || recipeRow.description;
	const notes =
		recipeTrans?.notes === undefined || recipeTrans?.notes === null
			? recipeRow.notes
			: recipeTrans.notes.trim() || recipeRow.notes;

	const ingredientIds = recipeRow.ingredients.map((i) => i.id);
	const stepIds = recipeRow.steps.map((s) => s.id);

	let ingredientTranslations: Array<{ ingredientId: string; name: string | null; note: string | null }> = [];
	let stepTranslations: Array<{ stepId: string; instruction: string | null }> = [];

	if (ingredientIds.length > 0) {
		const chunkSize = 90;
		for (let i = 0; i < ingredientIds.length; i += chunkSize) {
			const chunk = ingredientIds.slice(i, i + chunkSize);
			const chunkTranslations = await db.query.ingredientTranslation.findMany({
				where: (table, { and, eq, inArray }) =>
					and(inArray(table.ingredientId, chunk), eq(table.locale, locale))
			});
			ingredientTranslations.push(...chunkTranslations);
		}
	}

	if (stepIds.length > 0) {
		const chunkSize = 90;
		for (let i = 0; i < stepIds.length; i += chunkSize) {
			const chunk = stepIds.slice(i, i + chunkSize);
			const chunkTranslations = await db.query.stepTranslation.findMany({
				where: (table, { and, eq, inArray }) =>
					and(inArray(table.stepId, chunk), eq(table.locale, locale))
			});
			stepTranslations.push(...chunkTranslations);
		}
	}

	const ingredientMap = new Map(ingredientTranslations.map((t) => [t.ingredientId, t]));
	const stepMap = new Map(stepTranslations.map((t) => [t.stepId, t]));

	const ingredients: ResolvedIngredient[] = recipeRow.ingredients.map((ing) => {
		const t = ingredientMap.get(ing.id);
		const name = t?.name?.trim() || ing.name;
		const note = t?.note === undefined || t?.note === null ? ing.note : t.note.trim() || ing.note;
		return {
			id: ing.id,
			position: ing.position,
			quantity: ing.quantity,
			unit: ing.unit,
			name,
			note
		};
	});

	const steps: ResolvedStep[] = recipeRow.steps.map((step) => {
		const t = stepMap.get(step.id);
		const instruction = t?.instruction?.trim() || step.instruction;
		return {
			id: step.id,
			position: step.position,
			instruction
		};
	});

	return {
		...recipeRow,
		title,
		description,
		notes,
		ingredients,
		steps,
		resolvedLocale: locale,
		originalLocale: fallbackLocale,
		isTranslated: locale !== fallbackLocale && (recipeTrans !== null || ingredientTranslations.length > 0 || stepTranslations.length > 0)
	};
}
