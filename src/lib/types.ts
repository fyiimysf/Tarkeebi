export type SessionUser = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

export type RecipeTagRef = {
	name: string;
	slug: string;
};

export type RecipeIngredient = {
	id: string;
	quantity: string | null;
	unit: string | null;
	name: string;
	note: string | null;
};

export type RecipeStep = {
	id: string;
	position: number;
	instruction: string;
};

export type RecipeSummary = {
	id: string;
	title: string;
	description: string | null;
	imageUrl: string | null;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	isFavorite: boolean;
	isPublic: boolean;
	notes: string | null;
	cookedCount: number;
	lastCookedAt: Date | null;
	tags: RecipeTagRef[];
};

export type RecipeDetail = RecipeSummary & {
	sourceUrl: string | null;
	ingredients: RecipeIngredient[];
	steps: RecipeStep[];
};

export type RecipeFormInitial = {
	title?: string;
	description?: string | null;
	notes?: string | null;
	servings?: number;
	prepMinutes?: number | null;
	cookMinutes?: number | null;
	sourceUrl?: string | null;
	imageUrl?: string | null;
	isPublic?: boolean;
	tags?: string[];
	ingredients?: { quantity: string; unit: string; name: string; note?: string }[];
	steps?: { instruction: string }[];
};
