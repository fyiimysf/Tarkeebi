import { and, eq, inArray } from 'drizzle-orm';
import type { getDb } from './db/index.ts';
import { ingredient, recipeTag, step, tag } from './db/schema.ts';

type Db = ReturnType<typeof getDb>;

export type ParsedIngredient = {
	position: number;
	quantity: string | null;
	unit: string | null;
	name: string;
	note: string | null;
};

export type ParsedStep = {
	position: number;
	instruction: string;
};

export type ParsedTag = {
	name: string;
	slug: string;
};

function text(value: FormDataEntryValue | null) {
	return value?.toString().trim() ?? '';
}

function optionalText(value: FormDataEntryValue | null) {
	const valueText = text(value);
	return valueText ? valueText : null;
}

function optionalInt(value: FormDataEntryValue | null) {
	const valueText = text(value);
	if (!valueText) return null;
	const parsed = Number.parseInt(valueText, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * A readable, URL-safe tag slug. Non-Latin names get a short deterministic
 * fallback so different tags never collapse into the same slug.
 */
export function tagSlug(name: string): string {
	const base = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

	if (base) return base;

	let hash = 0;
	for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	return `tag-${hash.toString(36)}`;
}

export function parseTags(value: FormDataEntryValue | null): ParsedTag[] {
	const seen = new Set<string>();
	const tags: ParsedTag[] = [];

	for (const raw of text(value).split(',')) {
		const name = raw.trim().replace(/\s+/g, ' ').slice(0, 32);
		if (!name) continue;

		const slug = tagSlug(name);
		if (seen.has(slug)) continue;

		seen.add(slug);
		tags.push({ name, slug });
		if (tags.length >= 8) break;
	}

	return tags;
}

export function parseRecipeFields(form: FormData) {
	return {
		title: text(form.get('title')),
		description: optionalText(form.get('description')),
		notes: optionalText(form.get('notes')),
		servings: optionalInt(form.get('servings')) ?? 1,
		prepMinutes: optionalInt(form.get('prepMinutes')),
		cookMinutes: optionalInt(form.get('cookMinutes')),
		sourceUrl: optionalText(form.get('sourceUrl')),
		// Recipes stay private unless the user explicitly opts in.
		isPublic: form.get('isPublic') === 'on',
		tags: parseTags(form.get('tags'))
	};
}

export function parseIngredients(form: FormData): ParsedIngredient[] {
	const names = form.getAll('ingredientName');
	const quantities = form.getAll('ingredientQuantity');
	const units = form.getAll('ingredientUnit');
	const notes = form.getAll('ingredientNote');

	return names
		.map((name, index) => ({
			position: index,
			name: name.toString().trim(),
			quantity: quantities[index]?.toString().trim() || null,
			unit: units[index]?.toString().trim() || null,
			note: notes[index]?.toString().trim() || null
		}))
		.filter((item) => item.name.length > 0);
}

export function parseSteps(form: FormData): ParsedStep[] {
	return form
		.getAll('stepInstruction')
		.map((instruction, index) => ({
			position: index,
			instruction: instruction.toString().trim()
		}))
		.filter((item) => item.instruction.length > 0);
}

export async function replaceRecipeIngredients(
	db: Db,
	recipeId: string,
	ingredients: ParsedIngredient[]
) {
	await db.delete(ingredient).where(eq(ingredient.recipeId, recipeId));
	if (ingredients.length > 0) {
		const batchSize = 10;
		for (let i = 0; i < ingredients.length; i += batchSize) {
			const batch = ingredients.slice(i, i + batchSize).map((item) => ({ recipeId, ...item }));
			await db.insert(ingredient).values(batch);
		}
	}
}

export async function replaceRecipeSteps(db: Db, recipeId: string, steps: ParsedStep[]) {
	await db.delete(step).where(eq(step.recipeId, recipeId));
	if (steps.length > 0) {
		const batchSize = 10;
		for (let i = 0; i < steps.length; i += batchSize) {
			const batch = steps.slice(i, i + batchSize).map((item) => ({ recipeId, ...item }));
			await db.insert(step).values(batch);
		}
	}
}

export async function replaceRecipeTags(db: Db, recipeId: string, userId: string, tags: ParsedTag[]) {
	await db.delete(recipeTag).where(eq(recipeTag.recipeId, recipeId));
	if (tags.length === 0) return;

	await db
		.insert(tag)
		.values(tags.map((item) => ({ userId, name: item.name, slug: item.slug })))
		.onConflictDoNothing();

	const stored = await db
		.select({ id: tag.id, slug: tag.slug })
		.from(tag)
		.where(
			and(
				eq(tag.userId, userId),
				inArray(
					tag.slug,
					tags.map((item) => item.slug)
				)
			)
		);

	if (stored.length === 0) return;

	await db
		.insert(recipeTag)
		.values(stored.map((item) => ({ recipeId, tagId: item.id })))
		.onConflictDoNothing();
}
