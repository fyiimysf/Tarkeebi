CREATE TABLE `cook_log` (
	`recipe_id` text NOT NULL,
	`identity` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`first_cooked_at` integer NOT NULL,
	`last_cooked_at` integer NOT NULL,
	PRIMARY KEY(`recipe_id`, `identity`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cook_log_identity_idx` ON `cook_log` (`identity`);