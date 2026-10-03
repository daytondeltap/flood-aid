CREATE TABLE `destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`label` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`mode` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `destinations_owner` ON `destinations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `readings` (
	`station_id` text NOT NULL,
	`observed_at` integer NOT NULL,
	`depth` real NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`station_id`, `observed_at`)
);
--> statement-breakpoint
CREATE INDEX `readings_time` ON `readings` (`observed_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`place_id` text NOT NULL,
	`place_name` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`item` text NOT NULL,
	`status` text NOT NULL,
	`role` text NOT NULL,
	`note` text NOT NULL,
	`observed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_place_time` ON `reports` (`place_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `reports_expiry` ON `reports` (`expires_at`);--> statement-breakpoint
CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`report_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`vote` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`report_id`, `owner_id`)
);
