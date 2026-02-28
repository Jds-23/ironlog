import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@ironlog/db";
import { workouts, exercises, setTemplates } from "@ironlog/db/schema";
import { createWorkoutTables } from "./helpers/setup-db";
import { createAuthTables, signUpTestUser } from "./helpers/setup-auth";

let userId: string;

beforeAll(async () => {
  await createAuthTables();
  await createWorkoutTables();
  const { json } = await signUpTestUser({
    email: "schema-workout@test.com",
    password: "password123",
  });
  userId = json.user.id;
});

describe("workout schema", () => {
  it("insert & read workout", async () => {
    const [inserted] = await db.insert(workouts).values({ title: "Push Day", userId }).returning();

    const [row] = await db.select().from(workouts).where(eq(workouts.id, inserted!.id));

    expect(row!.id).toBe(inserted!.id);
    expect(row!.title).toBe("Push Day");
    expect(row!.createdAt).toBeInstanceOf(Date);
  });

  it("insert & read exercise", async () => {
    const [w] = await db.insert(workouts).values({ title: "Pull Day", userId }).returning();

    const [inserted] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Barbell Row", order: 1 })
      .returning();

    const [row] = await db.select().from(exercises).where(eq(exercises.id, inserted!.id));

    expect(row!.workoutId).toBe(w!.id);
    expect(row!.name).toBe("Barbell Row");
    expect(row!.order).toBe(1);
  });

  it("insert & read setTemplate", async () => {
    const [w] = await db.insert(workouts).values({ title: "Leg Day", userId }).returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Squat", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, weight: 135.5, targetReps: 8, order: 1 })
      .returning();

    const [row] = await db.select().from(setTemplates).where(eq(setTemplates.id, inserted!.id));

    expect(row!.exerciseId).toBe(e!.id);
    expect(row!.weight).toBe(135.5);
    expect(row!.targetReps).toBe(8);
    expect(row!.order).toBe(1);
  });

  it("cascade delete workout removes exercises and setTemplates", async () => {
    const [w] = await db.insert(workouts).values({ title: "Temp Workout", userId }).returning();
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
    const [w] = await db.insert(workouts).values({ title: "Another Workout", userId }).returning();
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
    const [w] = await db.insert(workouts).values({ title: "Bodyweight", userId }).returning();
    const [e] = await db
      .insert(exercises)
      .values({ workoutId: w!.id, name: "Pull-ups", order: 1 })
      .returning();

    const [inserted] = await db
      .insert(setTemplates)
      .values({ exerciseId: e!.id, order: 1 })
      .returning();

    const [row] = await db.select().from(setTemplates).where(eq(setTemplates.id, inserted!.id));

    expect(row!.weight).toBeNull();
    expect(row!.targetReps).toBeNull();
  });
});
