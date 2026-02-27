import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { db } from "@ironlog/db";
import { workouts, exercises, setTemplates } from "@ironlog/db/schema";

beforeAll(async () => {
  await env.DB.exec(
    "CREATE TABLE workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL);"
  );
  await env.DB.exec(
    'CREATE TABLE exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, "order" INTEGER NOT NULL);'
  );
  await env.DB.exec(
    "CREATE INDEX exercises_workout_id_idx ON exercises(workout_id);"
  );
  await env.DB.exec(
    'CREATE TABLE set_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, "order" INTEGER NOT NULL);'
  );
  await env.DB.exec(
    "CREATE INDEX set_templates_exercise_id_idx ON set_templates(exercise_id);"
  );
});

describe("workout schema", () => {
  it("insert & read workout", async () => {
    const [inserted] = await db
      .insert(workouts)
      .values({ title: "Push Day" })
      .returning();

    const [row] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, inserted!.id));

    expect(row!.id).toBe(inserted!.id);
    expect(row!.title).toBe("Push Day");
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("insert & read exercise", async () => {
    const [w] = await db
      .insert(workouts)
      .values({ title: "Pull Day" })
      .returning();

    const [inserted] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Barbell Row", order: 1 })
      .returning();

    const [row] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, inserted!.id));

    expect(row!.workoutId).toBe(w!.id);
    expect(row!.name).toBe("Barbell Row");
    expect(row!.order).toBe(1);
  });

  it("insert & read setTemplate", async () => {
    const [w] = await db
      .insert(workouts)
      .values({ title: "Leg Day" })
      .returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Squat", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 135.5, targetReps: 8, order: 1 })
      .returning();

    const [row] = await db
      .select()
      .from(setTemplates)
      .where(eq(setTemplates.id, inserted!.id));

    expect(row!.exerciseId).toBe(e!.id);
    expect(row!.weight).toBe(135.5);
    expect(row!.targetReps).toBe(8);
    expect(row!.order).toBe(1);
  });

  it("cascade delete workout removes exercises and setTemplates", async () => {
    const [w] = await db
      .insert(workouts)
      .values({ title: "Temp Workout" })
      .returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Bench", order: 1 })
      .returning();
    await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 100, targetReps: 10, order: 1 });

    await db.delete(workouts).where(eq(workouts.id, w!.id));

    const remainingExercises = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutId, w!.id));
    const remainingSets = await db
      .select()
      .from(setTemplates)
      .where(eq(setTemplates.exerciseId, e!.id));

    expect(remainingExercises).toHaveLength(0);
    expect(remainingSets).toHaveLength(0);
  });

  it("cascade delete exercise removes its setTemplates", async () => {
    const [w] = await db
      .insert(workouts)
      .values({ title: "Another Workout" })
      .returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Deadlift", order: 1 })
      .returning();
    await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 225, targetReps: 5, order: 1 });

    await db.delete(exercises).where(eq(exercises.id, e!.id));

    const remainingSets = await db
      .select()
      .from(setTemplates)
      .where(eq(setTemplates.exerciseId, e!.id));

    expect(remainingSets).toHaveLength(0);
  });

  it("nullable fields - setTemplate with null weight and targetReps", async () => {
    const [w] = await db
      .insert(workouts)
      .values({ title: "Bodyweight" })
      .returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Pull-ups", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, order: 1 })
      .returning();

    const [row] = await db
      .select()
      .from(setTemplates)
      .where(eq(setTemplates.id, inserted!.id));

    expect(row!.weight).toBeNull();
    expect(row!.targetReps).toBeNull();
  });
});
