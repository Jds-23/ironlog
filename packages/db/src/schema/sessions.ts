import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { workouts } from "./workouts";

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id),
    workoutTitle: text("workout_title").notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
  },
  (table) => [index("sessions_workout_id_idx").on(table.workoutId)],
);

export const loggedExercises = sqliteTable(
  "logged_exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull(),
    name: text("name").notNull(),
    order: integer("order").notNull(),
  },
  (table) => [index("logged_exercises_session_id_idx").on(table.sessionId)],
);

export const loggedSets = sqliteTable(
  "logged_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    loggedExerciseId: integer("logged_exercise_id")
      .notNull()
      .references(() => loggedExercises.id, { onDelete: "cascade" }),
    weight: real("weight"),
    targetReps: integer("target_reps"),
    actualReps: integer("actual_reps"),
    done: integer("done").default(0).notNull(),
    order: integer("order").notNull(),
  },
  (table) => [index("logged_sets_logged_exercise_id_idx").on(table.loggedExerciseId)],
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
