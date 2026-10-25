import { m } from '#lib/paraglide/messages.js';

/** Count labels read badly at one ("1 recipes"), so singulars get their own key. */
export function recipeCountLabel(count: number) {
	return count === 1 ? m.recipes_count_one() : m.recipes_count({ count });
}

export function servingsLabel(count: number) {
	return count === 1 ? m.recipe_servings_one() : m.recipe_servings({ count });
}

export function cookedLabel(count: number) {
	return count === 1 ? m.recipe_cooked_once() : m.recipe_cooked_count({ count });
}
