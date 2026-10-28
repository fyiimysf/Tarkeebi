CREATE TABLE `ingredient_translation` (
	`id` text PRIMARY KEY NOT NULL,
	`ingredient_id` text NOT NULL,
	`locale` text NOT NULL,
	`name` text,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_translation_unique` ON `ingredient_translation` (`ingredient_id`,`locale`);--> statement-breakpoint
CREATE INDEX `ingredient_translation_locale_idx` ON `ingredient_translation` (`locale`);--> statement-breakpoint
CREATE TABLE `recipe_translation` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text,
	`description` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_translation_unique` ON `recipe_translation` (`recipe_id`,`locale`);--> statement-breakpoint
CREATE INDEX `recipe_translation_locale_idx` ON `recipe_translation` (`locale`);--> statement-breakpoint
CREATE TABLE `step_translation` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`locale` text NOT NULL,
	`instruction` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `step`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `step_translation_unique` ON `step_translation` (`step_id`,`locale`);--> statement-breakpoint
CREATE INDEX `step_translation_locale_idx` ON `step_translation` (`locale`);--> statement-breakpoint
ALTER TABLE `recipe` ADD `locale` text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE INDEX `recipe_locale_idx` ON `recipe` (`locale`);