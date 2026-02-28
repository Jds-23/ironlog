import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const workouts = sqliteTable(
  "workouts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("workouts_user_id_idx").on(table.userId)],
);

export const exercises = sqliteTable(
  "exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
  },
  (table) => [index("exercises_workout_id_idx").on(table.workoutId)],
);

export const setTemplates = sqliteTable(
  "set_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    weight: real("weight"),
    targetReps: integer("target_reps"),
    order: integer("order").notNull(),
  },
  (table) => [index("set_templates_exercise_id_idx").on(table.exerciseId)],
);

export const workoutRelations = relations(workouts, ({ many }) => ({
  exercises: many(exercises),
}));

export const exerciseRelations = relations(exercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
  setTemplates: many(setTemplates),
}));

export const setTemplateRelations = relations(setTemplates, ({ one }) => ({
  exercise: one(exercises, {
    fields: [setTemplates.exerciseId],
    references: [exercises.id],
  }),
}));
