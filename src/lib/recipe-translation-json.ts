export type TranslationExport = {
	schemaVersion: number;
	source: {
		locale: string;
		recipeId: string;
		title: string;
		description: string | null;
		notes: string | null;
	};
	target: {
		locale: string;
	};
	recipe: {
		title: string;
		description: string | null;
		notes: string | null;
	};
	ingredients: Array<{
		index: number;
		id: string;
		quantity: string;
		unit: string;
		name: string;
		note: string;
	}>;
	steps: Array<{
		index: number;
		id: string;
		instruction: string;
	}>;
};

export function buildTranslationExport(data: {
	recipeId: string;
	originalLocale: string;
	title: string;
	description: string | null;
	notes: string | null;
	ingredients: Array<{ id: string; quantity: string; unit: string; name: string; note: string }>;
	steps: Array<{ id: string; instruction: string }>;
	targetLocale?: string;
}): TranslationExport {
	return {
		schemaVersion: 1,
		source: {
			locale: data.originalLocale,
			recipeId: data.recipeId,
			title: data.title,
			description: data.description,
			notes: data.notes
		},
		target: {
			locale: data.targetLocale ?? ''
		},
		recipe: {
			title: data.title,
			description: data.description,
			notes: data.notes
		},
		ingredients: data.ingredients.map((ing, index) => ({
			index,
			id: ing.id,
			quantity: ing.quantity ?? '',
			unit: ing.unit ?? '',
			name: ing.name ?? '',
			note: ing.note ?? ''
		})),
		steps: data.steps.map((step, index) => ({
			index,
			id: step.id,
			instruction: step.instruction ?? ''
		}))
	};
}

export function buildTranslationPrompt(targetLocale: string): string {
	return `You are translating a recipe JSON for use in my recipe app.

Translate ONLY the following fields to ${targetLocale}:
- recipe.title
- recipe.description
- recipe.notes
- ingredients[].name
- ingredients[].note
- steps[].instruction

DO NOT change or translate:
- source, target, schemaVersion
- ingredients[].quantity
- ingredients[].unit
- ingredients[].id, ingredients[].index
- steps[].id, steps[].index
- recipeId

Keep the exact JSON structure. Keep the same number of ingredients and steps. Use natural, authentic terminology for this dish. Return ONLY the valid JSON with the translated values filled in.`;
}

export type TranslationImportResult = {
	ok: true;
	data: TranslationExport;
	mapped: {
		recipe: { title: string; description: string; notes: string };
		ingredients: Array<{ index: number; id: string; name: string; note: string }>;
		steps: Array<{ index: number; id: string; instruction: string }>;
	};
};

export type TranslationImportError = {
	ok: false;
	message: string;
};

export function parseAndValidateTranslationImport(
	json: unknown,
	ctx: { expectedCount: { ingredients: number; steps: number } }
): TranslationImportResult | TranslationImportError {
	if (!json || typeof json !== 'object') {
		return { ok: false, message: 'Invalid JSON.' };
	}

	const obj = json as Record<string, unknown>;

	if (obj.schemaVersion !== 1) {
		return { ok: false, message: 'Unsupported schemaVersion. Expected 1.' };
	}

	const recipe = obj.recipe as Record<string, unknown> | undefined;
	if (!recipe || typeof recipe !== 'object') {
		return { ok: false, message: 'Missing recipe object.' };
	}

	const ingredients = Array.isArray(obj.ingredients) ? obj.ingredients : null;
	const steps = Array.isArray(obj.steps) ? obj.steps : null;

	if (!ingredients || !steps) {
		return { ok: false, message: 'Missing ingredients or steps arrays.' };
	}

	if (ingredients.length !== ctx.expectedCount.ingredients) {
		return {
			ok: false,
			message: `Ingredient count mismatch (expected ${ctx.expectedCount.ingredients}, got ${ingredients.length}).`
		};
	}

	if (steps.length !== ctx.expectedCount.steps) {
		return {
			ok: false,
			message: `Step count mismatch (expected ${ctx.expectedCount.steps}, got ${steps.length}).`
		};
	}

	const mappedIngredients = ingredients.map((item, idx) => {
		const ing = item as Record<string, unknown>;
		return {
			index: typeof ing.index === 'number' ? ing.index : idx,
			id: typeof ing.id === 'string' ? ing.id : '',
			name: typeof ing.name === 'string' ? ing.name : '',
			note: typeof ing.note === 'string' ? ing.note : ''
		};
	});

	const mappedSteps = steps.map((item, idx) => {
		const st = item as Record<string, unknown>;
		return {
			index: typeof st.index === 'number' ? st.index : idx,
			id: typeof st.id === 'string' ? st.id : '',
			instruction: typeof st.instruction === 'string' ? st.instruction : ''
		};
	});

	return {
		ok: true,
		data: obj as TranslationExport,
		mapped: {
			recipe: {
				title: typeof recipe.title === 'string' ? recipe.title : '',
				description: typeof recipe.description === 'string' ? recipe.description : recipe.description === null ? '' : '',
				notes: typeof recipe.notes === 'string' ? recipe.notes : recipe.notes === null ? '' : ''
			},
			ingredients: mappedIngredients,
			steps: mappedSteps
		}
	};
}
