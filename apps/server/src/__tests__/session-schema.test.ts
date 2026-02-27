import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { db } from "@ironlog/db";
import { workouts } from "@ironlog/db/schema";
import { sessions, loggedExercises, loggedSets } from "@ironlog/db/schema";

beforeAll(async () => {
  // Dependency tables
  await env.DB.exec(
    "CREATE TABLE workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, created_at INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL);",
  );
  await env.DB.exec(
    'CREATE TABLE exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec("CREATE INDEX exercises_workout_id_idx ON exercises(workout_id);");
  await env.DB.exec(
    'CREATE TABLE set_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec("CREATE INDEX set_templates_exercise_id_idx ON set_templates(exercise_id);");

  // Session tables
  await env.DB.exec(
    "CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id), workout_title TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER NOT NULL, duration_seconds INTEGER NOT NULL);",
  );
  await env.DB.exec("CREATE INDEX sessions_workout_id_idx ON sessions(workout_id);");
  await env.DB.exec(
    'CREATE TABLE logged_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, exercise_id INTEGER NOT NULL, name TEXT NOT NULL, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX logged_exercises_session_id_idx ON logged_exercises(session_id);",
  );
  await env.DB.exec(
    'CREATE TABLE logged_sets (id INTEGER PRIMARY KEY AUTOINCREMENT, logged_exercise_id INTEGER NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE, weight REAL, target_reps INTEGER, actual_reps INTEGER, done INTEGER NOT NULL DEFAULT 0, "order" INTEGER NOT NULL);',
  );
  await env.DB.exec(
    "CREATE INDEX logged_sets_logged_exercise_id_idx ON logged_sets(logged_exercise_id);",
  );
});

describe("session schema", () => {
  it("insert & read session", async () => {
    const [w] = await db.insert(workouts).values({ title: "Push Day" }).returning();

    const [inserted] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Push Day",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();

    const [row] = await db.select().from(sessions).where(eq(sessions.id, inserted!.id));

    expect(row!.workoutId).toBe(w!.id);
    expect(row!.workoutTitle).toBe("Push Day");
    expect(row!.startedAt).toBe(1700000000000);
    expect(row!.finishedAt).toBe(1700003600000);
    expect(row!.durationSeconds).toBe(3600);
  });

  it("insert & read loggedExercise", async () => {
    const [w] = await db.insert(workouts).values({ title: "Pull Day" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Pull Day",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();

    const [inserted] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 42, name: "Barbell Row", order: 1 })
      .returning();

    const [row] = await db
      .select()
      .from(loggedExercises)
      .where(eq(loggedExercises.id, inserted!.id));

    expect(row!.sessionId).toBe(s!.id);
    expect(row!.exerciseId).toBe(42);
    expect(row!.name).toBe("Barbell Row");
    expect(row!.order).toBe(1);
  });

  it("insert & read loggedSet", async () => {
    const [w] = await db.insert(workouts).values({ title: "Leg Day" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Leg Day",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Squat", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(loggedSets)
      .values({
        loggedExerciseId: le!.id,
        weight: 135.5,
        targetReps: 8,
        actualReps: 10,
        done: 1,
        order: 1,
      })
      .returning();

    const [row] = await db.select().from(loggedSets).where(eq(loggedSets.id, inserted!.id));

    expect(row!.loggedExerciseId).toBe(le!.id);
    expect(row!.weight).toBe(135.5);
    expect(row!.targetReps).toBe(8);
    expect(row!.actualReps).toBe(10);
    expect(row!.done).toBe(1);
    expect(row!.order).toBe(1);
  });

  it("done defaults to 0", async () => {
    const [w] = await db.insert(workouts).values({ title: "Default Test" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Default Test",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Bench", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(loggedSets)
      .values({ loggedExerciseId: le!.id, order: 1 })
      .returning();

    const [row] = await db.select().from(loggedSets).where(eq(loggedSets.id, inserted!.id));

    expect(row!.done).toBe(0);
  });

  it("nullable fields - loggedSet with null weight, targetReps, actualReps", async () => {
    const [w] = await db.insert(workouts).values({ title: "Bodyweight" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Bodyweight",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Pull-ups", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(loggedSets)
      .values({ loggedExerciseId: le!.id, order: 1 })
      .returning();

    const [row] = await db.select().from(loggedSets).where(eq(loggedSets.id, inserted!.id));

    expect(row!.weight).toBeNull();
    expect(row!.targetReps).toBeNull();
    expect(row!.actualReps).toBeNull();
  });

  it("cascade delete session removes loggedExercises and loggedSets", async () => {
    const [w] = await db.insert(workouts).values({ title: "Temp Workout" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Temp Workout",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Bench", order: 1 })
      .returning();
    await db
      .insert(loggedSets)
      .values({
        loggedExerciseId: le!.id,
        weight: 100,
        targetReps: 10,
        actualReps: 10,
        done: 1,
        order: 1,
      });

    await db.delete(sessions).where(eq(sessions.id, s!.id));

    const remainingExercises = await db
      .select()
      .from(loggedExercises)
      .where(eq(loggedExercises.sessionId, s!.id));
    const remainingSets = await db
      .select()
      .from(loggedSets)
      .where(eq(loggedSets.loggedExerciseId, le!.id));

    expect(remainingExercises).toHaveLength(0);
    expect(remainingSets).toHaveLength(0);
  });

  it("cascade delete loggedExercise removes its loggedSets", async () => {
    const [w] = await db.insert(workouts).values({ title: "Another Workout" }).returning();
    const [s] = await db
      .insert(sessions)
      .values({
        workoutId: w!.id,
        workoutTitle: "Another Workout",
        startedAt: 1700000000000,
        finishedAt: 1700003600000,
        durationSeconds: 3600,
      })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Deadlift", order: 1 })
      .returning();
    await db
      .insert(loggedSets)
      .values({
        loggedExerciseId: le!.id,
        weight: 225,
        targetReps: 5,
        actualReps: 5,
        done: 1,
        order: 1,
      });

    await db.delete(loggedExercises).where(eq(loggedExercises.id, le!.id));

    const remainingSets = await db
      .select()
      .from(loggedSets)
      .where(eq(loggedSets.loggedExerciseId, le!.id));

    expect(remainingSets).toHaveLength(0);
  });
});
