ALTER TABLE `recipe` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `cooked_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `recipe` ADD `last_cooked_at` integer;