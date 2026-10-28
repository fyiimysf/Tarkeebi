import { relations } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/**
 * A recipe owned by a single user.
 */
export const recipe = sqliteTable(
	'recipe',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		locale: text('locale').notNull().default('en'),
		title: text('title').notNull(),
		slug: text('slug'),
		description: text('description'),
		notes: text('notes'),
		imageUrl: text('image_url'),
		imageKey: text('image_key'),
		servings: integer('servings').notNull().default(1),
		prepMinutes: integer('prep_minutes'),
		cookMinutes: integer('cook_minutes'),
		sourceUrl: text('source_url'),
		isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
		isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		cookedCount: integer('cooked_count').notNull().default(0),
		lastCookedAt: integer('last_cooked_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [
		index('recipe_userId_idx').on(table.userId),
		index('recipe_locale_idx').on(table.locale),
		index('recipe_title_idx').on(table.title),
		uniqueIndex('recipe_slug_idx').on(table.slug),
		index('recipe_public_idx').on(table.isPublic, table.publishedAt)
	]
);

/**
 * A single ingredient line within a recipe, ordered by `position`.
 */
export const ingredient = sqliteTable(
	'ingredient',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		quantity: text('quantity'),
		unit: text('unit'),
		name: text('name').notNull(),
		note: text('note')
	},
	(table) => [index('ingredient_recipeId_idx').on(table.recipeId)]
);

/**
 * A preparation step within a recipe, ordered by `position`.
 */
export const step = sqliteTable(
	'step',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		instruction: text('instruction').notNull()
	},
	(table) => [index('step_recipeId_idx').on(table.recipeId)]
);

/**
 * One visitor's personal cook tally for a recipe. `identity` is a salted hash
 * of the visitor's address — the raw address is never stored — so the tally
 * follows the person, not the recipe's public popularity.
 */
export const cookLog = sqliteTable(
	'cook_log',
	{
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		identity: text('identity').notNull(),
		count: integer('count').notNull().default(0),
		firstCookedAt: integer('first_cooked_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		lastCookedAt: integer('last_cooked_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [
		primaryKey({ columns: [table.recipeId, table.identity] }),
		index('cook_log_identity_idx').on(table.identity)
	]
);

/**
 * A user-scoped tag. `slug` is unique per user.
 */
export const tag = sqliteTable(
	'tag',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		slug: text('slug').notNull()
	},
	(table) => [uniqueIndex('tag_userId_slug_idx').on(table.userId, table.slug)]
);

/**
 * Join table linking recipes to tags.
 */
export const recipeTag = sqliteTable(
	'recipe_tag',
	{
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tag.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.recipeId, table.tagId] })]
);

/**
 * Translated recipe fields.
 */
export const recipeTranslation = sqliteTable(
	'recipe_translation',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipe.id, { onDelete: 'cascade' }),
		locale: text('locale').notNull(),
		title: text('title'),
		description: text('description'),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('recipe_translation_unique').on(table.recipeId, table.locale),
		index('recipe_translation_locale_idx').on(table.locale)
	]
);

/**
 * Translated ingredient fields.
 */
export const ingredientTranslation = sqliteTable(
	'ingredient_translation',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		ingredientId: text('ingredient_id')
			.notNull()
			.references(() => ingredient.id, { onDelete: 'cascade' }),
		locale: text('locale').notNull(),
		name: text('name'),
		note: text('note'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('ingredient_translation_unique').on(table.ingredientId, table.locale),
		index('ingredient_translation_locale_idx').on(table.locale)
	]
);

/**
 * Translated step instructions.
 */
export const stepTranslation = sqliteTable(
	'step_translation',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		stepId: text('step_id')
			.notNull()
			.references(() => step.id, { onDelete: 'cascade' }),
		locale: text('locale').notNull(),
		instruction: text('instruction'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
			.$onUpdate(() => new Date())
	},
	(table) => [
		uniqueIndex('step_translation_unique').on(table.stepId, table.locale),
		index('step_translation_locale_idx').on(table.locale)
	]
);

export const recipeRelations = relations(recipe, ({ one, many }) => ({
	user: one(user, {
		fields: [recipe.userId],
		references: [user.id]
	}),
	ingredients: many(ingredient),
	steps: many(step),
	recipeTags: many(recipeTag),
	translations: many(recipeTranslation)
}));

export const recipeTranslationRelations = relations(recipeTranslation, ({ one }) => ({
	recipe: one(recipe, {
		fields: [recipeTranslation.recipeId],
		references: [recipe.id]
	})
}));

export const ingredientRelations = relations(ingredient, ({ one, many }) => ({
	recipe: one(recipe, {
		fields: [ingredient.recipeId],
		references: [recipe.id]
	}),
	translations: many(ingredientTranslation)
}));

export const ingredientTranslationRelations = relations(ingredientTranslation, ({ one }) => ({
	ingredient: one(ingredient, {
		fields: [ingredientTranslation.ingredientId],
		references: [ingredient.id]
	})
}));

export const stepRelations = relations(step, ({ one, many }) => ({
	recipe: one(recipe, {
		fields: [step.recipeId],
		references: [recipe.id]
	}),
	translations: many(stepTranslation)
}));

export const stepTranslationRelations = relations(stepTranslation, ({ one }) => ({
	step: one(step, {
		fields: [stepTranslation.stepId],
		references: [step.id]
	})
}));

export const tagRelations = relations(tag, ({ one, many }) => ({
	user: one(user, {
		fields: [tag.userId],
		references: [user.id]
	}),
	recipeTags: many(recipeTag)
}));

export const recipeTagRelations = relations(recipeTag, ({ one }) => ({
	recipe: one(recipe, {
		fields: [recipeTag.recipeId],
		references: [recipe.id]
	}),
	tag: one(tag, {
		fields: [recipeTag.tagId],
		references: [tag.id]
	})
}));

export * from './auth.schema';
