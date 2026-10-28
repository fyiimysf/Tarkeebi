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

/** The dashboard also sorts by creation order and total time. */
export type RecipeSummaryData = RecipeSummary & {
	createdAt: Date;
	totalMinutes: number;
};

/** The streamed dashboard payload: every summary plus the user's tag list. */
export type DashboardContentData = {
	recipes: RecipeSummaryData[];
	tags: RecipeTagRef[];
};

export type RecipeDetail = RecipeSummary & {
	sourceUrl: string | null;
	ingredients: RecipeIngredient[];
	steps: RecipeStep[];
};

/** The full shape returned by the owner-only recipe route. */
export type RecipeDetailData = {
	id: string;
	title: string;
	description: string | null;
	notes: string | null;
	imageUrl: string | null;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	isFavorite: boolean;
	isPublic: boolean;
	publishedAt: Date | null;
	slug: string | null;
	sourceUrl: string | null;
	myCookCount: number;
	myLastCookedAt: Date | null;
	cookedCount: number;
	lastCookedAt: Date | null;
	createdAt: Date;
	tags: RecipeTagRef[];
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
	ingredients?: { id?: string; quantity: string; unit: string; name: string; note?: string }[];
	steps?: { id?: string; instruction: string }[];
};

export type RecipeTranslationDraft = {
	locale: string;
	title: string;
	description: string;
	notes: string;
};

export type RecipeEntityTranslationDraft = {
	ingredients?: Array<{ id: string; name: string; note: string; translation: { locale: string; name: string; note: string } | null }>;
	steps?: Array<{ id: string; instruction: string; translation: { locale: string; instruction: string } | null }>;
};
