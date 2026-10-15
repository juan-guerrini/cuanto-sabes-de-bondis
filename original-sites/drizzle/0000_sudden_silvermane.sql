CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`country` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text NOT NULL,
	`correct` integer NOT NULL,
	`difficulty` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
