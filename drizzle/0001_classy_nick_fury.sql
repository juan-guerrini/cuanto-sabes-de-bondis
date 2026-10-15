CREATE TABLE `contributors` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `questions` ADD `author_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `author_name` text DEFAULT 'Juan' NOT NULL;