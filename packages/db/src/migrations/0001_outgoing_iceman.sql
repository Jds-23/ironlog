CREATE TABLE `logged_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `logged_exercises_session_id_idx` ON `logged_exercises` (`session_id`);--> statement-breakpoint
CREATE TABLE `logged_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`logged_exercise_id` integer NOT NULL,
	`weight` real,
	`target_reps` integer,
	`actual_reps` integer,
	`done` integer DEFAULT 0 NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`logged_exercise_id`) REFERENCES `logged_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `logged_sets_logged_exercise_id_idx` ON `logged_sets` (`logged_exercise_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`workout_title` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_workout_id_idx` ON `sessions` (`workout_id`);