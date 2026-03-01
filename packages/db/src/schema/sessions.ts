import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { workouts } from "./workouts";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    workoutId: text("workout_id").references(() => workouts.id),
    workoutTitle: text("workout_title").notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_workout_id_idx").on(table.workoutId),
  ],
);

export const loggedExercises = sqliteTable(
  "logged_exercises",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("logged_exercises_session_id_idx").on(table.sessionId),
    index("logged_exercises_user_id_idx").on(table.userId),
  ],
);

export const loggedSets = sqliteTable(
  "logged_sets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    loggedExerciseId: text("logged_exercise_id")
      .notNull()
      .references(() => loggedExercises.id, { onDelete: "cascade" }),
    weight: real("weight"),
    targetReps: integer("target_reps"),
    actualReps: integer("actual_reps"),
    done: integer("done").default(0).notNull(),
    order: integer("order").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("logged_sets_logged_exercise_id_idx").on(table.loggedExerciseId),
    index("logged_sets_user_id_idx").on(table.userId),
  ],
);

export const workoutSessionRelations = relations(sessions, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [sessions.workoutId],
    references: [workouts.id],
  }),
  loggedExercises: many(loggedExercises),
}));

export const loggedExerciseRelations = relations(loggedExercises, ({ one, many }) => ({
  session: one(sessions, {
    fields: [loggedExercises.sessionId],
    references: [sessions.id],
  }),
  loggedSets: many(loggedSets),
}));

export const loggedSetRelations = relations(loggedSets, ({ one }) => ({
  loggedExercise: one(loggedExercises, {
    fields: [loggedSets.loggedExerciseId],
    references: [loggedExercises.id],
  }),
}));
