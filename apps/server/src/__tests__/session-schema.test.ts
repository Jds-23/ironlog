import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@ironlog/db";
import { workouts } from "@ironlog/db/schema";
import { sessions, loggedExercises, loggedSets } from "@ironlog/db/schema";
import { createSessionTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser } from "./helpers/setup-auth";

let userId: string;

beforeAll(async () => {
  await createAuthTables();
  await createSessionTables();
  const { json } = await signUpTestUser({
    email: "schema-session@test.com",
    password: "password123",
  });
  userId = json.user.id;
});

function sessionValues(workoutId: number) {
  return {
    userId,
    workoutId,
    workoutTitle: "Test",
    startedAt: 1700000000000,
    finishedAt: 1700003600000,
    durationSeconds: 3600,
  };
}

describe("session schema", () => {
  it("insert & read session", async () => {
    const [w] = await db.insert(workouts).values({ title: "Push Day", userId }).returning();

    const [inserted] = await db
      .insert(sessions)
      .values({
        ...sessionValues(w!.id),
        workoutTitle: "Push Day",
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
    const [w] = await db.insert(workouts).values({ title: "Pull Day", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Pull Day" })
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
    const [w] = await db.insert(workouts).values({ title: "Leg Day", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Leg Day" })
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
    const [w] = await db.insert(workouts).values({ title: "Default Test", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Default Test" })
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
    const [w] = await db.insert(workouts).values({ title: "Bodyweight", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Bodyweight" })
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
    const [w] = await db.insert(workouts).values({ title: "Temp Workout", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Temp Workout" })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Bench", order: 1 })
      .returning();
    await db.insert(loggedSets).values({
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
    const [w] = await db.insert(workouts).values({ title: "Another Workout", userId }).returning();
    const [s] = await db
      .insert(sessions)
      .values({ ...sessionValues(w!.id), workoutTitle: "Another Workout" })
      .returning();
    const [le] = await db
      .insert(loggedExercises)
      .values({ sessionId: s!.id, exerciseId: 1, name: "Deadlift", order: 1 })
      .returning();
    await db.insert(loggedSets).values({
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
