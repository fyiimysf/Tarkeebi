ALTER TABLE `recipe` ADD `slug` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `recipe` ADD `published_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_slug_idx` ON `recipe` (`slug`);--> statement-breakpoint
CREATE INDEX `recipe_public_idx` ON `recipe` (`is_public`,`published_at`);