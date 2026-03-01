CREATE TABLE `metric_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `metric_definitions_user_id_idx` ON `metric_definitions` (`user_id`);--> statement-breakpoint
CREATE TABLE `metric_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`metric_definition_id` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`metric_definition_id`) REFERENCES `metric_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metric_entries_user_id_idx` ON `metric_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `metric_entries_definition_id_idx` ON `metric_entries` (`metric_definition_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metric_entries_definition_date_idx` ON `metric_entries` (`metric_definition_id`,`date`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_exercises`("id", "user_id", "workout_id", "name", "order", "updated_at", "deleted_at") SELECT "id", "user_id", "workout_id", "name", "order", "updated_at", "deleted_at" FROM `exercises`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
ALTER TABLE `__new_exercises` RENAME TO `exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `exercises_workout_id_idx` ON `exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `exercises_user_id_idx` ON `exercises` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_set_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`weight` real,
	`target_reps` integer,
	`order` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_set_templates`("id", "user_id", "exercise_id", "weight", "target_reps", "order", "updated_at", "deleted_at") SELECT "id", "user_id", "exercise_id", "weight", "target_reps", "order", "updated_at", "deleted_at" FROM `set_templates`;--> statement-breakpoint
DROP TABLE `set_templates`;--> statement-breakpoint
ALTER TABLE `__new_set_templates` RENAME TO `set_templates`;--> statement-breakpoint
CREATE INDEX `set_templates_exercise_id_idx` ON `set_templates` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `set_templates_user_id_idx` ON `set_templates` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_workouts`("id", "user_id", "title", "created_at", "updated_at", "deleted_at") SELECT "id", "user_id", "title", "created_at", "updated_at", "deleted_at" FROM `workouts`;--> statement-breakpoint
DROP TABLE `workouts`;--> statement-breakpoint
ALTER TABLE `__new_workouts` RENAME TO `workouts`;--> statement-breakpoint
CREATE INDEX `workouts_user_id_idx` ON `workouts` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_logged_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_logged_exercises`("id", "user_id", "session_id", "exercise_id", "name", "order", "updated_at", "deleted_at") SELECT "id", "user_id", "session_id", "exercise_id", "name", "order", "updated_at", "deleted_at" FROM `logged_exercises`;--> statement-breakpoint
DROP TABLE `logged_exercises`;--> statement-breakpoint
ALTER TABLE `__new_logged_exercises` RENAME TO `logged_exercises`;--> statement-breakpoint
CREATE INDEX `logged_exercises_session_id_idx` ON `logged_exercises` (`session_id`);--> statement-breakpoint
CREATE INDEX `logged_exercises_user_id_idx` ON `logged_exercises` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_logged_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`logged_exercise_id` text NOT NULL,
	`weight` real,
	`target_reps` integer,
	`actual_reps` integer,
	`done` integer DEFAULT 0 NOT NULL,
	`order` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`logged_exercise_id`) REFERENCES `logged_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_logged_sets`("id", "user_id", "logged_exercise_id", "weight", "target_reps", "actual_reps", "done", "order", "updated_at", "deleted_at") SELECT "id", "user_id", "logged_exercise_id", "weight", "target_reps", "actual_reps", "done", "order", "updated_at", "deleted_at" FROM `logged_sets`;--> statement-breakpoint
DROP TABLE `logged_sets`;--> statement-breakpoint
ALTER TABLE `__new_logged_sets` RENAME TO `logged_sets`;--> statement-breakpoint
CREATE INDEX `logged_sets_logged_exercise_id_idx` ON `logged_sets` (`logged_exercise_id`);--> statement-breakpoint
CREATE INDEX `logged_sets_user_id_idx` ON `logged_sets` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_id` text,
	`workout_title` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "user_id", "workout_id", "workout_title", "started_at", "finished_at", "duration_seconds", "updated_at", "deleted_at") SELECT "id", "user_id", "workout_id", "workout_title", "started_at", "finished_at", "duration_seconds", "updated_at", "deleted_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_workout_id_idx` ON `sessions` (`workout_id`);